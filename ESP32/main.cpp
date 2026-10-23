// ============================================================
//  MEDCASE - Firmware ESP32 (v2.0) — usa o backend Flask
// ============================================================
//
//  Antes: lia/gravava direto no Firebase (nó global medcase.json).
//  Agora: conversa com o backend MedCase (pasta backend/) pelas rotas
//         do firmware, e só enxerga os remédios da conta vinculada:
//
//    GET  /api/dispositivo/<id>/agenda?data=AAAA-MM-DD   remédios e horários do dia
//    POST /api/dispositivo/<id>/tomadas                   confirma a dose (botão)
//    PUT  /api/dispositivo/<id>/status                    "online" (aparece no app)
//    POST /api/dispositivo/<id>/logs                      logs vistos no app (Integração ESP32)
//
//  COMO USAR
//  1. Bibliotecas (Arduino IDE -> Gerenciador de Bibliotecas):
//       - WiFiManager (tzapu)        - ArduinoJson (Benoit Blanchon, v7)
//  2. Grave o firmware. Na 1ª vez o ESP cria a rede Wi-Fi "MEDCASE-SETUP":
//     conecte nela pelo celular, escolha seu Wi-Fi e preencha
//     "Servidor MedCase" com o endereço do backend, ex.: http://192.168.0.47:5000
//     (IP do PC que roda `python init.py`) ou a URL https do ngrok.
//  3. O ID do dispositivo aparece no portal e no Serial (comando I), ex.: MC-A1B2C3.
//     No app: Integração ESP32 -> digite o ID -> Vincular.
//
//  FUNCIONAMENTO (igual à versão Firebase)
//  - A cada 30s verifica se há dose dentro de ±5 min do horário programado.
//  - Achou: acende o LED e mostra no Serial. Botão (GPIO 5) ou "Q" confirma.
//  - Confirmou: LED apaga e pisca 3x. O servidor registra a dose, avisa os
//    contatos pelo WhatsApp e envia o push.
//  Novidades:
//  - Considera cada dose separadamente (antes, depois da 1ª confirmação o
//    remédio nunca mais alertava) e suporta horários manuais.
//  - Se a dose for registrada pelo app, o alerta apaga sozinho.
//  - Segurar o botão por 5s abre o portal de configuração (trocar Wi-Fi/servidor).
//
//  Comandos Serial: Q confirmar | S verificar | W Wi-Fi | H hora | I info | R resetar config
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include "time.h"

// ============================================================
// PROTÓTIPOS DAS FUNÇÕES
// ============================================================
void conectarWiFi(bool forcarPortal);
bool garantirWiFi();
void configurarHora();
bool obterHora(struct tm& timeinfo);
void mostrarHoraAtual();
void verificarStatusWiFi();
void mostrarInfo();
void resetarConfiguracao();
int requisicao(const char* metodo, const String& caminho, const String& corpo, String& resposta);
bool enviarStatus();
void registrarLog(const char* tipo, const String& mensagem);
void verificarMedicamentos();
bool dentroDaJanela(const String& hora, int minutosAtuais);
void dispararAlerta(const String& dispositivo, int posicao, const String& nome, const String& dose, const String& hora, const String& data);
void confirmarMedicamentoTomado();
void limparAlerta();
void piscarLED(int vezes, int tempoLigado, int tempoDesligado);
void lerBotao();
void lerSerial();
String dataHoje(const struct tm& t);
String horaAgora(const struct tm& t);
String timestampISO();

// ============================================================
// CONFIGURAÇÕES
// ============================================================
#define FIRMWARE_VERSAO "2.0"

// Endereço padrão do backend (pode ser trocado pelo portal "MEDCASE-SETUP")
const char* SERVIDOR_PADRAO = "http://192.168.0.47:5000";
const char* NOME_DISPOSITIVO = "Maleta MedCase";

// NTP (Brasil, GMT-3)
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = -3 * 3600;
const int daylightOffset_sec = 0;
const char* SUFIXO_FUSO = "-03:00";  // usado no timestamp dos logs

// Pinos
const int LED_PIN = 2;    // LED interno
const int BOTAO_PIN = 5;  // botão físico (com pull-up interno)

// Tempos
const unsigned long checkInterval = 30000;      // verificar medicamentos: 30s
const unsigned long statusInterval = 120000;    // "estou online": 2 min
const unsigned long tempoPortalBotao = 5000;    // segurar botão 5s -> portal
const int JANELA_MINUTOS = 5;                   // alerta se |agora - dose| <= 5 min
const int HTTP_TIMEOUT_MS = 10000;

// ============================================================
// VARIÁVEIS GLOBAIS
// ============================================================
Preferences prefs;
String servidorUrl;  // ex.: http://192.168.0.47:5000 (sem /api e sem barra final)
String espId;        // ex.: MC-A1B2C3 (derivado do MAC)
bool vinculado = false;

unsigned long lastCheck = 0;
unsigned long lastStatus = 0;

// Alerta atual
bool alertaAtivo = false;
String medicamentoAtual = "";
String dispositivoAtual = "";  // "maleta" ou "tag"
int posicaoAtual = 0;           // número do nicho / da tag
String horaProgramadaAtual = "";
String dataAlertaAtual = "";

// Debounce / pressão longa do botão
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 50;
bool lastButtonState = HIGH;
bool buttonState = HIGH;
unsigned long botaoPressionadoEm = 0;
bool pressaoLongaTratada = false;

// Parâmetro do servidor no portal WiFiManager
bool salvarParametros = false;

// ============================================================
// SETUP E LOOP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  pinMode(BOTAO_PIN, INPUT_PULLUP);

  // ID do dispositivo: "MC-" + 3 últimos bytes do MAC (fixo para cada placa)
  WiFi.mode(WIFI_STA);
  String mac = WiFi.macAddress();  // "AA:BB:CC:DD:EE:FF"
  mac.replace(":", "");
  espId = "MC-" + mac.substring(6);

  prefs.begin("medcase", false);
  servidorUrl = prefs.getString("servidor", SERVIDOR_PADRAO);

  Serial.println("\n=================================");
  Serial.println("   MEDCASE - ESP32 Medication");
  Serial.println("   Firmware v" FIRMWARE_VERSAO " (backend Flask)");
  Serial.println("=================================");
  Serial.print("ID do dispositivo: ");
  Serial.println(espId);

  conectarWiFi(false);
  configurarHora();

  if (enviarStatus()) {
    registrarLog("SISTEMA", "Dispositivo iniciado (firmware v" FIRMWARE_VERSAO ", IP " + WiFi.localIP().toString() + ")");
  }
  lastStatus = millis();

  Serial.println("\nComandos disponiveis:");
  Serial.println("  BOTAO - Confirmar que tomou o medicamento (quando em alerta)");
  Serial.println("  BOTAO (segurar 5s) - Abrir portal de configuracao");
  Serial.println("  Q - Confirmar pelo Serial");
  Serial.println("  S - Verificar medicamentos agora");
  Serial.println("  W - Ver status WiFi");
  Serial.println("  H - Ver hora atual");
  Serial.println("  I - Ver ID / servidor / vinculo");
  Serial.println("  R - Resetar WiFi e servidor");
  Serial.println("=================================\n");

  verificarMedicamentos();
  lastCheck = millis();
}

void loop() {
  lerBotao();
  lerSerial();

  if (millis() - lastCheck >= checkInterval) {
    lastCheck = millis();
    verificarMedicamentos();
  }

  // Mantém o dispositivo como "Online" no app
  if (millis() - lastStatus >= statusInterval) {
    lastStatus = millis();
    enviarStatus();
  }

  delay(10);
}

// ============================================================
// ENTRADAS (BOTÃO E SERIAL)
// ============================================================
void lerBotao() {
  bool reading = digitalRead(BOTAO_PIN);

  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading != buttonState) {
      buttonState = reading;

      if (buttonState == LOW) {  // pressionou (pull-up)
        botaoPressionadoEm = millis();
        pressaoLongaTratada = false;
      } else if (!pressaoLongaTratada) {  // soltou: clique curto
        if (alertaAtivo) {
          confirmarMedicamentoTomado();
        } else {
          Serial.println("Nenhum alerta ativo no momento.");
        }
      }
    }

    // Segurando por 5s -> portal de configuração
    if (buttonState == LOW && !pressaoLongaTratada && millis() - botaoPressionadoEm >= tempoPortalBotao) {
      pressaoLongaTratada = true;
      Serial.println("\nBotao pressionado por 5s: abrindo portal de configuracao...");
      conectarWiFi(true);
    }
  }

  lastButtonState = reading;
}

void lerSerial() {
  if (!Serial.available()) return;

  char comando = toupper(Serial.read());
  switch (comando) {
    case 'Q':
      if (alertaAtivo) {
        confirmarMedicamentoTomado();
      } else {
        Serial.println("Nenhum alerta ativo no momento.");
      }
      break;
    case 'W':
      verificarStatusWiFi();
      break;
    case 'S':
      Serial.println("Verificando medicamentos manualmente...");
      verificarMedicamentos();
      break;
    case 'H':
      mostrarHoraAtual();
      break;
    case 'I':
      mostrarInfo();
      break;
    case 'R':
      resetarConfiguracao();
      break;
    default:
      break;
  }

  while (Serial.available()) Serial.read();  // limpar buffer
}

// ============================================================
// WI-FI E CONFIGURAÇÃO (WiFiManager)
// ============================================================

// forcarPortal=false: conecta no Wi-Fi salvo (abre o portal só se não houver)
// forcarPortal=true : abre o portal para trocar Wi-Fi / servidor
void conectarWiFi(bool forcarPortal) {
  WiFiManager wm;

  // Campos extras do portal: servidor do backend + ID para digitar no app
  WiFiManagerParameter paramServidor("servidor", "Servidor MedCase (ex.: http://192.168.0.47:5000)", servidorUrl.c_str(), 120);
  String htmlId = "<p>ID do dispositivo (digite no app em <b>Integra&ccedil;&atilde;o ESP32</b>): <b>" + espId + "</b></p>";
  WiFiManagerParameter paramInfo(htmlId.c_str());
  wm.addParameter(&paramInfo);
  wm.addParameter(&paramServidor);
  wm.setSaveParamsCallback([]() { salvarParametros = true; });
  wm.setSaveConfigCallback([]() { salvarParametros = true; });
  wm.setConfigPortalTimeout(180);  // 3 min sem configurar -> segue/reinicia

  Serial.println(forcarPortal ? "Portal de configuracao: conecte na rede MEDCASE-SETUP" : "Iniciando WiFi Manager...");
  digitalWrite(LED_PIN, HIGH);  // LED aceso enquanto o portal estiver aberto

  bool res = forcarPortal ? wm.startConfigPortal("MEDCASE-SETUP") : wm.autoConnect("MEDCASE-SETUP");
  digitalWrite(LED_PIN, alertaAtivo ? HIGH : LOW);

  if (salvarParametros) {
    salvarParametros = false;
    String novo = String(paramServidor.getValue());
    novo.trim();
    while (novo.endsWith("/")) novo.remove(novo.length() - 1);
    if (novo.endsWith("/api")) novo.remove(novo.length() - 4);
    if (novo.length() > 0) {
      servidorUrl = novo;
      prefs.putString("servidor", servidorUrl);
      Serial.print("Servidor salvo: ");
      Serial.println(servidorUrl);
    }
  }

  if (!res) {
    Serial.println("Falha ao conectar no WiFi. Reiniciando...");
    delay(1000);
    ESP.restart();
  }

  Serial.println("WiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  if (forcarPortal) enviarStatus();
}

// Reconecta sem abrir o portal (não trava o loop)
bool garantirWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.println("WiFi desconectado. Tentando reconectar...");
  WiFi.reconnect();
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 10000) {
    delay(250);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi reconectado.");
    registrarLog("SISTEMA", "WiFi reconectado");
    return true;
  }
  Serial.println("Sem WiFi.");
  return false;
}

void verificarStatusWiFi() {
  Serial.println("\n--- STATUS WIFI ---");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Status: CONECTADO");
    Serial.print("SSID: ");
    Serial.println(WiFi.SSID());
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("Status: DESCONECTADO");
    garantirWiFi();
  }
  mostrarHoraAtual();
  Serial.println("-------------------\n");
}

void mostrarInfo() {
  Serial.println("\n--- MEDCASE ---");
  Serial.print("ID do dispositivo: ");
  Serial.println(espId);
  Serial.print("Servidor: ");
  Serial.println(servidorUrl);
  Serial.print("Vinculado a uma conta: ");
  Serial.println(vinculado ? "SIM" : "NAO (vincule no app: Integracao ESP32)");
  Serial.print("Firmware: v");
  Serial.println(FIRMWARE_VERSAO);
  Serial.println("---------------\n");
}

void resetarConfiguracao() {
  Serial.println("Apagando WiFi e servidor salvos e reiniciando...");
  WiFiManager wm;
  wm.resetSettings();
  prefs.clear();
  delay(500);
  ESP.restart();
}

// ============================================================
// HORA (NTP)
// ============================================================
void configurarHora() {
  Serial.println("\nConfigurando hora via NTP...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer, "time.nist.gov", "a.st1.ntp.br");

  struct tm timeinfo;
  int tentativas = 0;
  while (!getLocalTime(&timeinfo) && tentativas < 20) {
    Serial.print(".");
    delay(500);
    tentativas++;
  }
  Serial.println();

  if (getLocalTime(&timeinfo)) {
    Serial.println("✓ Hora sincronizada com sucesso!");
    mostrarHoraAtual();
    piscarLED(2, 100, 100);  // pronto
  } else {
    Serial.println("✗ Falha ao sincronizar hora. Verifique a conexao.");
  }
}

bool obterHora(struct tm& timeinfo) {
  if (getLocalTime(&timeinfo)) return true;
  Serial.println("Falha ao obter hora local. Tentando sincronizar de novo...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer, "time.nist.gov", "a.st1.ntp.br");
  return getLocalTime(&timeinfo, 5000);
}

void mostrarHoraAtual() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char buffer[50];
    strftime(buffer, sizeof(buffer), "%d/%m/%Y %H:%M:%S", &timeinfo);
    Serial.print("Hora atual: ");
    Serial.println(buffer);
  } else {
    Serial.println("Hora nao disponivel");
  }
}

String dataHoje(const struct tm& t) {
  char buf[11];
  strftime(buf, sizeof(buf), "%Y-%m-%d", &t);
  return String(buf);
}

String horaAgora(const struct tm& t) {
  char buf[6];
  strftime(buf, sizeof(buf), "%H:%M", &t);
  return String(buf);
}

String timestampISO() {
  struct tm t;
  if (!getLocalTime(&t, 100)) return "";
  char buf[20];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &t);
  return String(buf) + SUFIXO_FUSO;
}

// ============================================================
// HTTP (BACKEND)
// ============================================================

// Faz a requisição para servidorUrl + "/api" + caminho.
// Retorna o status HTTP (ou valor negativo em erro de conexão).
int requisicao(const char* metodo, const String& caminho, const String& corpo, String& resposta) {
  resposta = "";
  if (!garantirWiFi()) return -1;

  String url = servidorUrl + "/api" + caminho;
  WiFiClient clienteHttp;
  WiFiClientSecure clienteHttps;
  HTTPClient http;

  bool iniciou;
  if (url.startsWith("https://")) {
    clienteHttps.setInsecure();  // aceita o certificado do ngrok/servidor sem validar
    iniciou = http.begin(clienteHttps, url);
  } else {
    iniciou = http.begin(clienteHttp, url);
  }
  if (!iniciou) {
    Serial.println("URL do servidor invalida: " + url);
    return -1;
  }

  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("ngrok-skip-browser-warning", "true");

  int httpCode = http.sendRequest(metodo, corpo);
  if (httpCode > 0) {
    resposta = http.getString();
  } else {
    Serial.print("Erro na requisicao (");
    Serial.print(url);
    Serial.print("): ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  return httpCode;
}

// PUT /api/dispositivo/<id>/status -> aparece "Online" no app
bool enviarStatus() {
  JsonDocument doc;
  doc["status"] = "online";
  doc["nome"] = NOME_DISPOSITIVO;
  String corpo, resposta;
  serializeJson(doc, corpo);

  int code = requisicao("PUT", "/dispositivo/" + espId + "/status", corpo, resposta);
  if (code == 200) {
    vinculado = true;
    return true;
  }
  if (code == 404) {
    vinculado = false;
    Serial.println("Dispositivo ainda nao vinculado. No app: Integracao ESP32 -> ID " + espId);
  }
  return false;
}

// POST /api/dispositivo/<id>/logs (SISTEMA | ALERTA | ERRO | SUCESSO | INFO)
void registrarLog(const char* tipo, const String& mensagem) {
  if (WiFi.status() != WL_CONNECTED) return;
  JsonDocument doc;
  doc["tipo"] = tipo;
  doc["mensagem"] = mensagem;
  String ts = timestampISO();
  if (ts.length()) doc["timestamp"] = ts;
  String corpo, resposta;
  serializeJson(doc, corpo);
  requisicao("POST", "/dispositivo/" + espId + "/logs", corpo, resposta);
}

// ============================================================
// MEDICAMENTOS
// ============================================================
void verificarMedicamentos() {
  struct tm timeinfo;
  if (!obterHora(timeinfo)) return;  // sem hora não dá para saber o que tomar

  String data = alertaAtivo ? dataAlertaAtual : dataHoje(timeinfo);
  int minutosAtuais = timeinfo.tm_hour * 60 + timeinfo.tm_min;

  if (!alertaAtivo) Serial.println("\n[Verificando medicamentos...]");

  String resposta;
  int code = requisicao("GET", "/dispositivo/" + espId + "/agenda?data=" + data, "", resposta);

  if (code == 404) {
    vinculado = false;
    Serial.println("Dispositivo nao vinculado a nenhuma conta.");
    Serial.println("No app, va em Integracao ESP32 e digite o ID: " + espId);
    piscarLED(1, 600, 0);
    return;
  }
  if (code != 200) {
    Serial.println("Nao foi possivel buscar a agenda no servidor (" + servidorUrl + ").");
    return;
  }
  vinculado = true;

  JsonDocument doc;
  DeserializationError erro = deserializeJson(doc, resposta);
  if (erro) {
    Serial.print("Resposta invalida do servidor: ");
    Serial.println(erro.c_str());
    return;
  }

  JsonArray medicamentos = doc["medicamentos"].as<JsonArray>();

  // Alerta ativo: só confere se a dose já foi registrada pelo app
  if (alertaAtivo) {
    for (JsonObject med : medicamentos) {
      if (String((const char*)(med["dispositivo"] | "")) != dispositivoAtual || (med["posicao"] | 0) != posicaoAtual) continue;
      for (JsonObject h : med["horarios"].as<JsonArray>()) {
        if (String((const char*)(h["hora"] | "")) == horaProgramadaAtual && (h["tomado"] | false)) {
          Serial.println("Dose de " + medicamentoAtual + " ja foi registrada pelo app. Alerta encerrado.");
          limparAlerta();
          return;
        }
      }
    }
    Serial.println("[Alerta ja ativo. Pressione o botao para confirmar]");
    return;
  }

  for (JsonObject med : medicamentos) {
    for (JsonObject h : med["horarios"].as<JsonArray>()) {
      String hora = h["hora"] | "";
      bool tomado = h["tomado"] | false;
      if (!tomado && dentroDaJanela(hora, minutosAtuais)) {
        dispararAlerta(med["dispositivo"] | "maleta", med["posicao"] | 0, med["nome"] | "", med["dose"] | "", hora, data);
        return;  // um alerta por vez (igual à versão anterior)
      }
    }
  }

  mostrarHoraAtual();
  Serial.println("Nenhum medicamento pendente para este horario.");
}

bool dentroDaJanela(const String& hora, int minutosAtuais) {
  if (hora.length() < 5) return false;
  int minutosDose = hora.substring(0, 2).toInt() * 60 + hora.substring(3, 5).toInt();
  return abs(minutosDose - minutosAtuais) <= JANELA_MINUTOS;
}

void dispararAlerta(const String& dispositivo, int posicao, const String& nome, const String& dose, const String& hora, const String& data) {
  String local = (dispositivo == "maleta" ? "Nicho " : "Tag ") + String(posicao);

  Serial.println("\n########################################");
  Serial.println("#  ALERTA DE MEDICAMENTO!             #");
  Serial.println("#  ALERTA DE MEDICAMENTO!             #");
  Serial.println("########################################");
  Serial.println("Dispositivo: " + dispositivo + " - " + local);
  Serial.println("Medicamento: " + nome);
  if (dose.length()) Serial.println("Dose: " + dose);
  Serial.println("Horario: " + hora);
  Serial.println("\n>>> PRESSIONE O BOTAO PARA CONFIRMAR QUE TOMOU <<<");
  Serial.println("########################################\n");

  alertaAtivo = true;
  medicamentoAtual = nome;
  dispositivoAtual = dispositivo;
  posicaoAtual = posicao;
  horaProgramadaAtual = hora;
  dataAlertaAtual = data;

  digitalWrite(LED_PIN, HIGH);  // LED aceso = hora do remédio
  registrarLog("ALERTA", "Hora de tomar " + nome + " (" + hora + ") - " + local);
}

void confirmarMedicamentoTomado() {
  if (!alertaAtivo) {
    Serial.println("Nenhum alerta ativo para confirmar.");
    return;
  }

  Serial.println("\nConfirmando que tomou: " + medicamentoAtual);

  struct tm timeinfo;
  JsonDocument doc;
  doc["dispositivo"] = dispositivoAtual;
  doc["posicao"] = posicaoAtual;
  doc["hora_programada"] = horaProgramadaAtual;
  doc["data"] = dataAlertaAtual;
  if (getLocalTime(&timeinfo, 100)) doc["hora_real"] = horaAgora(timeinfo);
  String corpo, resposta;
  serializeJson(doc, corpo);

  // POST /api/dispositivo/<id>/tomadas (o servidor avisa contatos e app)
  int code = requisicao("POST", "/dispositivo/" + espId + "/tomadas", corpo, resposta);

  if (code == 201) {
    Serial.println("✓ Medicamento marcado como TOMADO no servidor!");
    Serial.println("✓ O aplicativo sera atualizado automaticamente.");
    registrarLog("SUCESSO", "Dose confirmada pelo botao: " + medicamentoAtual + " (" + horaProgramadaAtual + ")");

    limparAlerta();
    piscarLED(3, 200, 200);  // confirmou

    Serial.println("\nMonitoramento continuara normalmente...");
    Serial.println("=================================\n");
    verificarMedicamentos();  // já procura a próxima dose pendente
  } else {
    Serial.print("✗ Erro ao registrar a dose (HTTP ");
    Serial.print(code);
    Serial.println("). Verifique a conexao e tente de novo.");
    if (resposta.length()) Serial.println(resposta);
    // mantém o LED aceso e o alerta ativo
  }
}

void limparAlerta() {
  digitalWrite(LED_PIN, LOW);
  alertaAtivo = false;
  medicamentoAtual = "";
  dispositivoAtual = "";
  posicaoAtual = 0;
  horaProgramadaAtual = "";
  dataAlertaAtual = "";
}

void piscarLED(int vezes, int tempoLigado, int tempoDesligado) {
  for (int i = 0; i < vezes; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(tempoLigado);
    digitalWrite(LED_PIN, LOW);
    if (i < vezes - 1) delay(tempoDesligado);
  }
}

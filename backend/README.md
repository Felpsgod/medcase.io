# MedCase — Backend (Flask + SQLite)

API do app MedCase. Substitui o acesso direto ao Firebase Realtime Database.

```
backend/
├── init.py            # cria o app, cria as tabelas (se não existirem) e sobe o servidor
├── requirements.txt
├── models/            # tabelas (SQLAlchemy)
│   ├── usuario.py         usuarios, sessoes
│   ├── medicamento.py     medicamentos, tomadas
│   ├── contato.py         contatos
│   ├── notificacao.py     notificacoes
│   ├── dispositivo.py     dispositivos_esp, logs_esp
│   ├── farmaceutico.py    farmaceuticos, agendamentos
│   └── whatsapp.py        mensagens_whatsapp (histórico de envios)
└── routes/            # endpoints (um blueprint por assunto)
    ├── auth.py  perfil.py  dados.py  medicamentos.py  contatos.py
    ├── notificacoes.py  esp32.py  dispositivo.py  farmaceuticos.py
    └── utils.py           # login_obrigatorio, erros, push (OneSignal), WhatsApp
```

## WhatsApp (pasta `../whatsapp`)

O backend envia mensagens pela sua API Node (`whatsapp/api.js`, whatsapp-web.js), usando `POST http://localhost:3005/enviar` com `{numero, mensagem}`. Rode as duas coisas:

```bash
cd whatsapp && node api.js        # na 1ª vez, escaneie o QR (terminal ou http://localhost:3005/qr)
cd backend  && python init.py
```

| Quando | O que é enviado | Se a API falhar |
|---|---|---|
| `POST /api/auth/esqueci-senha` | nova senha para o WhatsApp do usuário | responde erro e **a senha não é trocada** (a antiga continua valendo) |
| Dose registrada (pelo app ou pelo ESP32) | aviso para todos os contatos de acompanhamento, com os sintomas relatados | a dose é salva normalmente; a falha fica registrada |

- Os avisos aos contatos são enviados em segundo plano, então registrar a dose não fica esperando o WhatsApp.
- Toda tentativa fica na tabela `mensagens_whatsapp` (enviado ou não, com o motivo). A senha nunca é gravada.
- O número é convertido para `55` + DDD + número antes do envio. A API Node só adiciona o `55` quando o número não começa com 55, o que quebraria telefones com **DDD 55** (RS); o backend já corrige isso.
- `WHATSAPP_AVISAR_CONTATOS=0` desliga o aviso aos contatos.

## Rodar

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
python init.py
```

O servidor sobe em `http://0.0.0.0:5000` e é acessível pelo celular na mesma rede Wi-Fi (`http://<IP-do-PC>:5000`). O arquivo `medcase.db` é criado na primeira execução. Rodar de novo não apaga nada, porque só cria as tabelas que faltam. Na primeira vez, o Windows pode pedir para liberar o Python no firewall: permita em **redes privadas**.

| Variável de ambiente | Padrão | Para que serve |
|---|---|---|
| `PORT` | `5000` | porta |
| `DATABASE_URL` | `sqlite:///medcase.db` | banco |
| `WHATSAPP_API_URL` | `http://localhost:3005` | endereço da API de WhatsApp (`whatsapp/api.js`) |
| `WHATSAPP_AVISAR_CONTATOS` | `1` | `0` = não avisa os contatos a cada dose |
| `ONESIGNAL_REST_API_KEY` | vazia | se definida, o servidor envia o push "Dose Registrada" |
| `FLASK_DEBUG` | — | `1` = recarrega ao salvar |

## Autenticação

`POST /api/auth/login` (ou `register`) devolve `{ token, usuario }`. As demais rotas exigem o header `Authorization: Bearer <token>`. Erros sempre chegam como `{ "erro": "mensagem" }`. As senhas são guardadas com hash (no Firebase ficavam em texto puro).

## Rotas

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | `{nome, email, telefone, senha}` |
| POST | `/api/auth/login` | `{email, senha}` |
| POST | `/api/auth/logout` | invalida o token |
| GET | `/api/auth/me` | usuário logado |
| POST | `/api/auth/esqueci-senha` | `{email}`: gera senha temporária e envia pelo WhatsApp |
| GET / PUT | `/api/perfil` | nome, telefone, tipo sanguíneo, alergias, emergência, foto |
| PUT | `/api/perfil/preferencias` | `{push, som}` |
| GET | `/api/dados` | tudo do usuário (polling de 3s): `slots_maleta`, `tags_pulseira`, `contatos`, `notificacoes` |
| PUT | `/api/medicamentos/<maleta\|tag>/<n>` | cria/edita o remédio do nicho/tag `n` (mantém o histórico) |
| DELETE | `/api/medicamentos/<maleta\|tag>/<n>` | remove o remédio e o histórico |
| POST | `/api/medicamentos/<maleta\|tag>/<n>/tomadas` | `{data, hora_programada, hora_real, sintomas}`, avisa os contatos e devolve `contatos_avisados` |
| DELETE | `/api/tomadas` | reinicia todo o histórico |
| GET / POST | `/api/contatos` | lista / cria `{tipo, nome, telefone}` |
| PUT / DELETE | `/api/contatos/<id>` | edita / remove |
| GET / POST | `/api/notificacoes` | lista / cria `{titulo, mensagem}` |
| PUT | `/api/notificacoes/lidas` | marca todas como lidas |
| GET / POST | `/api/esp` | lista / vincula `{esp_id}` |
| DELETE | `/api/esp/<esp_id>` | desvincula |
| GET / DELETE | `/api/esp/<esp_id>/logs` | logs (mais recentes primeiro) / limpar |
| GET | `/api/farmaceuticos` | `?busca=&especialidade=` |
| POST | `/api/farmaceuticos/<id>/agendamentos` | `{data, periodo, motivo}` |
| GET | `/api/agendamentos` | pedidos do usuário |
| GET | `/api/health` | status do servidor |

O servidor cria as notificações internas sozinho: medicamento salvo/removido, dose registrada, contato, perfil, ESP32 e consulta.

### Firmware do ESP32 (sem token: o ESP se identifica pelo ID, como no Firebase)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/dispositivo/<esp_id>/vinculo` | `{vinculado, usuario_id}` (antes: ler `vinculos_esp/<id>`) |
| PUT | `/api/dispositivo/<esp_id>/status` | `{status: "online"}`. Sem contato por 5 min, o app mostra offline |
| POST | `/api/dispositivo/<esp_id>/logs` | `{tipo: SISTEMA\|ALERTA\|ERRO\|SUCESSO\|INFO, mensagem, timestamp?}` |
| GET | `/api/dispositivo/<esp_id>/agenda` | `?data=AAAA-MM-DD`: remédios, horários e o que já foi tomado |
| POST | `/api/dispositivo/<esp_id>/tomadas` | `{dispositivo, posicao, hora_programada, hora_real?, data?}` |

> O firmware em [`../ESP32/main.cpp`](../ESP32/main.cpp) (v2.0) já usa essas rotas. O endereço do backend é configurado no portal Wi-Fi "MEDCASE-SETUP", e o ID do dispositivo (`MC-XXXXXX`, gerado a partir do MAC) aparece no portal e no Serial (comando `I`).

## Produção

`python init.py` usa o servidor de desenvolvimento do Flask. Para publicar, use um servidor WSGI (ex.: `waitress-serve --port=5000 init:app` no Windows, ou `gunicorn init:app` no Linux) atrás de **HTTPS**, e preencha `expo.extra.apiUrl` no `app.json` do app com a URL pública. A API de WhatsApp não tem autenticação: deixe a porta 3005 acessível só na própria máquina/rede interna, nunca exposta na internet.

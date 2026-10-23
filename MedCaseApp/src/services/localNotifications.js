// =====================================================
// Notificações locais (expo-notifications) — funcionam no Expo Go
//
//  - Boas-vindas ao criar a conta
//  - Lembrete diário no horário de cada dose (maleta e tags), agendado
//    no próprio celular: toca mesmo com o app fechado e sem internet
//  - Aviso quando a maleta (ESP32) confirma uma dose (com o app aberto)
//
// O push remoto (OneSignal) continua em services/notifications.js e só
// funciona em build de desenvolvimento/produção, não no Expo Go.
// =====================================================
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getHorariosDoDia, formatarDose, isExpirado } from '../utils/doseHelpers';
import { toLocalISODate } from '../utils/dateHelpers';

const CANAL_DOSES = 'doses';
const CANAL_GERAL = 'geral';
const PREFIXO_DOSE = 'dose-';
const LIMITE_IOS = 60; // o iOS guarda no máximo 64 notificações agendadas

let somAtivo = true;

// Como mostrar a notificação quando o app está aberto (em primeiro plano)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: somAtivo,
    shouldSetBadge: false,
  }),
});

/** Preferência "Som de Alerta" */
export function configurarSom(ativo) {
  somAtivo = ativo !== false;
}

/** Canais do Android (no Android 8+ toda notificação precisa de um canal). */
export async function prepararNotificacoes() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_DOSES, {
    name: 'Lembretes de dose',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#04BF8A',
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync(CANAL_GERAL, {
    name: 'Avisos do MedCase',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function temPermissao() {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

/** Pede permissão (só mostra o diálogo do sistema se ainda puder perguntar). */
export async function pedirPermissao() {
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;
  const resp = await Notifications.requestPermissionsAsync();
  return resp.granted;
}

/** Mostra uma notificação agora. Retorna false se não houver permissão. */
export async function notificarAgora(titulo, corpo, { canal = CANAL_GERAL, data = {} } = {}) {
  if (!(await temPermissao())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: corpo, data, sound: somAtivo ? 'default' : false },
    trigger: Platform.OS === 'android' ? { channelId: canal } : null,
  });
  return true;
}

export async function notificarBoasVindas(nome) {
  const primeiroNome = (nome || '').trim().split(' ')[0];
  return notificarAgora(
    `Bem-vindo(a) ao MedCase${primeiroNome ? `, ${primeiroNome}` : ''}! 🎉`,
    'Sua conta foi criada. Cadastre seus remédios e nós avisamos na hora de cada dose.'
  );
}

/** Cancela só os lembretes de dose (não mexe em outras notificações). */
export async function cancelarLembretesDoses() {
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    agendadas
      .filter((n) => n.identifier.startsWith(PREFIXO_DOSE))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/**
 * Reagenda todos os lembretes diários a partir dos remédios atuais.
 * Remédios com tratamento encerrado (data limite) ficam de fora; como o app
 * reagenda sempre que abre ou que os remédios mudam, um lembrete diário de um
 * tratamento que acabou é removido na próxima vez que o app abrir.
 * Retorna quantos lembretes foram agendados.
 */
export async function agendarLembretesDoses(maletaSlots, pulseiraTags) {
  await cancelarLembretesDoses();
  if (!(await temPermissao())) return 0;

  const hoje = toLocalISODate();
  const itens = [];
  const coletar = (ds, local) => {
    for (const key in ds) {
      const med = ds[key];
      if (!med?.nome || isExpirado(med, hoje)) continue;
      const numero = key.split('_')[1];
      for (const hora of getHorariosDoDia(med)) itens.push({ key, med, hora, local: `${local} ${numero}` });
    }
  };
  coletar(maletaSlots, 'Nicho');
  coletar(pulseiraTags, 'Tag');

  const lista = Platform.OS === 'ios' ? itens.slice(0, LIMITE_IOS) : itens;
  for (const { key, med, hora, local } of lista) {
    const [hour, minute] = hora.split(':').map(Number);
    const dose = formatarDose(med);
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIXO_DOSE}${key}-${hora}`,
      content: {
        title: `💊 Hora do remédio — ${hora}`,
        body: `${med.nome}${dose ? ` • ${dose}` : ''} (${local}). Toque para registrar no app.`,
        data: { tipo: 'dose', key, hora },
        sound: somAtivo ? 'default' : false,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CANAL_DOSES },
    });
  }
  return lista.length;
}

/** Quantos lembretes de dose estão agendados (usado na tela de Configurações). */
export async function contarLembretesAgendados() {
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  return agendadas.filter((n) => n.identifier.startsWith(PREFIXO_DOSE)).length;
}

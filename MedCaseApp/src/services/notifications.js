// =====================================================
// Push notifications — OneSignal
// Web SDK (OneSignalDeferred) -> react-native-onesignal (SDK nativo v5).
// =====================================================
import Constants from 'expo-constants';

export const APP_ID = '06ccb5ea-16e0-4c72-9612-5460f097be42';

// O ENVIO de push agora é feito pelo backend (variável ONESIGNAL_REST_API_KEY
// do servidor), então a REST API Key não fica mais dentro do app. O app só
// identifica o aparelho com o id do usuário (external_id) para o servidor
// mandar o push apenas para a pessoa certa (antes ia para o segmento "All").

// O Expo Go não contém o módulo nativo do OneSignal. Carregamos de forma
// "preguiçosa" para o app continuar funcionando (sem push) no Expo Go.
let OneSignal = null;
const isExpoGo = Constants.executionEnvironment === 'storeClient';
if (!isExpoGo) {
  try {
    OneSignal = require('react-native-onesignal').OneSignal;
  } catch (e) {
    OneSignal = null;
  }
}

let iniciado = false;

/** Equivalente ao OneSignal.init() do <head> do painel.html */
export function initOneSignal() {
  if (!OneSignal || iniciado) return;
  try {
    OneSignal.initialize(APP_ID);
    iniciado = true;
  } catch (e) {
    console.warn('OneSignal não pôde ser inicializado:', e);
  }
}

export function isPushDisponivel() {
  return !!OneSignal;
}

/**
 * pedirPermissaoNotificacao — no iOS o HTML exigia "Adicionar à Tela de Início";
 * no app nativo basta pedir a permissão.
 * Retorna true/false (concedida) ou lança erro se o push não estiver disponível.
 */
export async function pedirPermissaoNotificacao() {
  if (!OneSignal) {
    throw new Error('Push indisponível no Expo Go. Gere um build de desenvolvimento (npx expo run:android / run:ios).');
  }
  initOneSignal();
  return OneSignal.Notifications.requestPermission(true);
}

/** Associa este aparelho ao usuário logado (external_id = id do usuário no backend). */
export function loginOneSignal(usuarioId) {
  if (!OneSignal || usuarioId == null) return;
  try {
    initOneSignal();
    OneSignal.login(String(usuarioId));
  } catch (e) {
    console.warn('OneSignal.login falhou:', e);
  }
}

/** Desassocia o aparelho ao sair da conta (para não receber push de outra pessoa). */
export function logoutOneSignal() {
  if (!OneSignal) return;
  try {
    OneSignal.logout();
  } catch (e) {
    console.warn('OneSignal.logout falhou:', e);
  }
}

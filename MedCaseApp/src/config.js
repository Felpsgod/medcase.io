// =====================================================
// Endereço do backend (Flask) — pasta ../backend, porta 5000
//
// Ordem de prioridade:
// 1. Variável EXPO_PUBLIC_API_URL (ex.: URL do ngrok), definida ao rodar:
//      PowerShell:  $env:EXPO_PUBLIC_API_URL="https://xxxx.ngrok-free.app"; npx expo start
//      bash:        EXPO_PUBLIC_API_URL=https://xxxx.ngrok-free.app npx expo start
// 2. app.json -> expo.extra.apiUrl (ex.: "https://api.medcase.com.br" em produção)
// 3. Automático em desenvolvimento: IP do computador que roda o Metro + porta 5000
//    (celular no MESMO Wi-Fi). Não funciona com "expo start --tunnel": nesse
//    caso use a opção 1.
// 4. Sem Metro: emulador Android usa 10.0.2.2; iOS/web usam localhost.
// =====================================================
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const API_PORTA = 5000;

const IP_OU_LOCAL = /^(\d{1,3}(\.\d{1,3}){3}|localhost|[\w-]+\.local)$/;

function urlDesenvolvimento() {
  const hostUri = Constants.expoConfig?.hostUri; // ex.: "192.168.0.10:8081"
  const host = hostUri ? hostUri.split(':')[0] : null;
  // Só usa o host do Metro se for um IP/nome da rede local (no --tunnel ele
  // é um domínio exp.direct, que não tem o backend na porta 5000)
  if (host && IP_OU_LOCAL.test(host)) return `http://${host}:${API_PORTA}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `http://${window.location.hostname}:${API_PORTA}`;
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORTA}`; // localhost do PC visto pelo emulador
  return `http://localhost:${API_PORTA}`;
}

const configurada = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;

export const API_URL = `${(configurada || urlDesenvolvimento()).replace(/\/+$/, '')}/api`;

if (__DEV__) console.log(`[MedCase] API: ${API_URL}`);

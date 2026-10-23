// =====================================================
// Autenticação — agora via backend Flask
//   POST /api/auth/register | /api/auth/login | /api/auth/logout
//   GET  /api/auth/me       | POST /api/auth/esqueci-senha
// Sessão local no AsyncStorage: token (medcase_token) + usuário (medcase_user)
// =====================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, request } from './api';

export const STORAGE_TOKEN = 'medcase_token';
export const STORAGE_USER = 'medcase_user';

/** Lê a sessão salva -> { token, usuario } ou null */
export async function lerSessao() {
  try {
    const [token, raw] = await Promise.all([AsyncStorage.getItem(STORAGE_TOKEN), AsyncStorage.getItem(STORAGE_USER)]);
    if (!token || !raw) return null;
    return { token, usuario: JSON.parse(raw) };
  } catch (e) {
    return null;
  }
}

async function salvarSessao({ token, usuario }) {
  await AsyncStorage.multiSet([
    [STORAGE_TOKEN, token],
    [STORAGE_USER, JSON.stringify(usuario)],
  ]);
  return { token, usuario };
}

/** Atualiza o usuário salvo (após editar perfil / preferências). */
export async function atualizarUsuarioLocal(usuario) {
  await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(usuario));
  return usuario;
}

export async function limparSessao() {
  await AsyncStorage.multiRemove([STORAGE_TOKEN, STORAGE_USER, 'medcase_auth']);
}

export async function handleLogin(emailRaw, senha) {
  const email = (emailRaw || '').trim();
  if (!email || !senha) throw new ApiError('Informe e-mail e senha.', 400);
  return salvarSessao(await request('/auth/login', { method: 'POST', body: { email, senha }, auth: false }));
}

export async function handleRegister({ nome, email, telefone, senha }) {
  const dados = { nome: (nome || '').trim(), email: (email || '').trim(), telefone: (telefone || '').trim(), senha: senha || '' };
  // Mesma validação do login.html (o servidor valida de novo)
  if (!dados.nome || !dados.email.includes('@') || dados.senha.length < 4) {
    throw new ApiError('Preencha todos os campos corretamente (senha com 4+ caracteres).', 400);
  }
  return salvarSessao(await request('/auth/register', { method: 'POST', body: dados, auth: false }));
}

/**
 * Esqueci minha senha: o servidor gera a senha temporária e coloca a
 * mensagem na fila do robô de WhatsApp. Retorna a mensagem de sucesso.
 */
export async function handleForgot(emailRaw) {
  const email = (emailRaw || '').trim();
  if (!email) throw new ApiError('Digite o e-mail da sua conta.', 400);
  const data = await request('/auth/esqueci-senha', { method: 'POST', body: { email }, auth: false });
  return data.mensagem;
}

/** GET /api/auth/me — dados atualizados do usuário (ex.: perfil editado em outro aparelho). */
export async function buscarUsuarioAtual() {
  return (await request('/auth/me')).usuario;
}

/** Invalida o token no servidor (melhor esforço: sair funciona mesmo offline). */
export async function logoutServidor() {
  try {
    await request('/auth/logout', { method: 'POST', body: {} });
  } catch (e) {
    // ignora: a sessão local é apagada de qualquer forma
  }
}

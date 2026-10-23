// =====================================================
// Cliente HTTP do backend MedCase (Flask + SQLite)
// Substitui o acesso REST direto ao Firebase (services/firebase.js).
//
// Toda rota autenticada envia:  Authorization: Bearer <token>
// Erros do servidor chegam como { "erro": "mensagem" } -> ApiError(mensagem)
// =====================================================
import { API_URL } from '../config';

const TIMEOUT_MS = 15000;

let token = null;
let onUnauthorized = null;

export function setToken(novo) {
  token = novo || null;
}
export function getToken() {
  return token;
}
/** Chamado quando o servidor responde 401 (sessão expirada) -> AuthContext faz logout. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(path, { method = 'GET', body, auth = true } = {}) {
  // ngrok-skip-browser-warning: evita a página de aviso do ngrok gratuito
  // (inofensivo quando não há ngrok)
  const headers = { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet.', 0);
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await resp.json();
  } catch (e) {
    data = null;
  }

  if (!resp.ok) {
    if (resp.status === 401 && auth && token && onUnauthorized) onUnauthorized();
    throw new ApiError(data?.erro || `Erro ${resp.status} no servidor.`, resp.status);
  }
  return data;
}

const get = (path) => request(path);
const post = (path, body) => request(path, { method: 'POST', body: body ?? {} });
const put = (path, body) => request(path, { method: 'PUT', body: body ?? {} });
const del = (path) => request(path, { method: 'DELETE' });

// No front as tags se chamam "pulseira"; na API o dispositivo é "tag"
const dispositivoApi = (tipo) => (tipo === 'maleta' ? 'maleta' : 'tag');

/* ---------------- Dados agregados (polling 3s) ---------------- */
/** GET /api/dados -> { slots_maleta, tags_pulseira, contatos, notificacoes } */
export const fetchDados = () => get('/dados');

/* ---------------- Medicamentos (maleta / tags) ---------------- */
/** PUT /api/medicamentos/<maleta|tag>/<posicao> */
export const salvarMedicamento = (tipo, posicao, dados) => put(`/medicamentos/${dispositivoApi(tipo)}/${posicao}`, dados);
/** DELETE /api/medicamentos/<maleta|tag>/<posicao> */
export const removerMedicamento = (tipo, posicao) => del(`/medicamentos/${dispositivoApi(tipo)}/${posicao}`);
/** POST /api/medicamentos/<maleta|tag>/<posicao>/tomadas  {data, hora_programada, hora_real, sintomas} */
export const registrarTomada = (tipo, posicao, dados) =>
  post(`/medicamentos/${dispositivoApi(tipo)}/${posicao}/tomadas`, dados);
/** DELETE /api/tomadas — Reiniciar Histórico */
export const reiniciarHistorico = () => del('/tomadas');

/* ---------------- Contatos ---------------- */
/** POST /api/contatos (novo) ou PUT /api/contatos/<id> (edição) */
export const salvarContato = (id, dados) => (id ? put(`/contatos/${id}`, dados) : post('/contatos', dados));
/** DELETE /api/contatos/<id> */
export const removerContato = (id) => del(`/contatos/${id}`);

/* ---------------- Notificações ---------------- */
/** POST /api/notificacoes — só para eventos locais do aparelho; o resto o servidor já registra */
export const registrarNotificacao = (titulo, mensagem) => post('/notificacoes', { titulo, mensagem });

/* ---------------- Perfil ---------------- */
/** PUT /api/perfil -> usuario atualizado */
export const salvarPerfil = async (dados) => (await put('/perfil', dados)).usuario;
/** PUT /api/perfil/preferencias {push, som} -> usuario atualizado */
export const salvarPreferencias = async (prefs) => (await put('/perfil/preferencias', prefs)).usuario;

/* ---------------- Farmacêuticos ---------------- */
/** GET /api/farmaceuticos -> lista */
export const listarFarmaceuticos = async () => (await get('/farmaceuticos')).farmaceuticos || [];
/** POST /api/farmaceuticos/<id>/agendamentos {data, periodo, motivo} */
export const agendarFarmaceutico = (id, dados) => post(`/farmaceuticos/${id}/agendamentos`, dados);

export const api = { get, post, put, del };

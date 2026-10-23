// =====================================================
// Integração ESP32 — lado do app (backend Flask)
//   GET    /api/esp                  lista os dispositivos do usuário
//   POST   /api/esp {esp_id}         vincula
//   DELETE /api/esp/<id>             desvincula
//   GET    /api/esp/<id>/logs        logs (mais recentes primeiro)
//   DELETE /api/esp/<id>/logs        limpa os logs
// O firmware usa as rotas /api/dispositivo/<id>/... (ver backend/README.md).
// =====================================================
import { api } from './api';

export async function vincularESP(espIdRaw) {
  const espId = (espIdRaw || '').trim();
  if (!espId) throw new Error('Digite o ID do dispositivo');
  return (await api.post('/esp', { esp_id: espId })).dispositivo;
}

/** -> { "<esp_id>": { dispositivo_id, nome, status, data_vinculo, ultimo_contato } } */
export async function carregarDispositivos() {
  return (await api.get('/esp')).dispositivos || {};
}

/** -> [ { id, tipo, mensagem, timestamp } ] já ordenado (mais recentes primeiro) */
export async function carregarLogs(espId) {
  if (!espId) return [];
  return (await api.get(`/esp/${encodeURIComponent(espId)}/logs`)).logs || [];
}

/** Filtro por tipo (o servidor já devolve em ordem). */
export function prepararLogs(logs, filtro = 'TODOS') {
  const arr = Array.isArray(logs) ? logs : [];
  return filtro === 'TODOS' ? arr : arr.filter((l) => l.tipo === filtro);
}

export async function limparLogs(espId) {
  return api.del(`/esp/${encodeURIComponent(espId)}/logs`);
}

// No Firebase o vínculo global (vinculos_esp) ficava; agora desvincular
// remove o dispositivo da conta e o ESP32 passa a responder "não vinculado".
export async function desvincularESP(espId) {
  return api.del(`/esp/${encodeURIComponent(espId)}`);
}

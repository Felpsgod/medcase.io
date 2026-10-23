// =====================================================
// Helpers de data/hora
// =====================================================

export const mesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

const pad = (n) => String(n).padStart(2, '0');

/**
 * Data no formato YYYY-MM-DD no FUSO LOCAL.
 * O painel.html usava date.toISOString().split('T')[0] (UTC), que no Brasil
 * "pula" para o dia seguinte depois das 21h. O formato da chave no Firebase
 * continua idêntico ("YYYY-MM-DD_HH:MM"); só corrigimos o dia calculado.
 */
export function toLocalISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM" local (usado na adesão mensal). */
export function toLocalISOMonth(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** Converte "YYYY-MM-DD" em Date local (meia-noite). */
export function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Equivalente ao preencherHoraAgora(): retorna "HH:MM" atual. */
export function horaAgora() {
  const agora = new Date();
  return `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
}

/** "HH:MM" -> Date de hoje com aquela hora (para o DateTimePicker). */
export function horaParaDate(hhmm) {
  const d = new Date();
  if (hhmm && hhmm.includes(':')) {
    const [h, m] = hhmm.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

/** Date -> "HH:MM" */
export function dateParaHora(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * formatarHoraAMPM do HTML. Lá retornava HTML com <i class="fa-moon|fa-sun">.
 * Aqui retornamos os dados e o componente <HoraAMPM> desenha o ícone.
 */
export function formatarHoraAMPM(hora24) {
  if (!hora24 || !hora24.includes(':')) return null;
  const [hs, m] = hora24.split(':');
  let h = parseInt(hs, 10);
  const isNight = h >= 18 || h < 6;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h || 12;
  return { isNight, text: `${pad(h)}:${m} ${ampm}` };
}

/** Domingo da semana de uma data (calendário semanal). */
export function inicioDaSemana(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Notificações: "dd/mm/aaaa HH:MM" */
export function formatarDataHora(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Logs: "HH:MM:SS" */
export function formatarHoraCompleta(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'N/A';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** "dd/mm/aaaa" */
export function formatarData(iso) {
  if (!iso) return 'N/A';
  const d = typeof iso === 'string' && iso.length === 10 ? parseISODate(iso) : new Date(iso);
  if (!d || isNaN(d.getTime())) return 'N/A';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

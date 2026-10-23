// =====================================================
// Lógica de posologia / doses — portada do painel.html
// =====================================================
import { toLocalISODate, toLocalISOMonth } from './dateHelpers';
import { colorPalette } from '../theme/gradients';

export const SLOTS_MALETA = 6;

/** Unidades do <select id="slot-dose-unidade"> */
export const UNIDADES_DOSE = [
  { value: 'comprimido(s)', label: 'Comprimido(s)' },
  { value: 'cápsula(s)', label: 'Cápsula(s)' },
  { value: 'mg', label: 'mg' },
  { value: 'ml', label: 'ml' },
  { value: 'colher(es) de chá', label: 'Colher(es) de chá' },
  { value: 'colher(es) de sopa', label: 'Colher(es) de sopa' },
  { value: 'gota(s)', label: 'Gota(s)' },
];

/**
 * getHorariosDoDia — idêntico ao HTML.
 * Custom: usa horarios_custom. Fixo: primeira_dose + i*intervalo, sem passar das 24h.
 */
export function getHorariosDoDia(data) {
  let horarios = [];
  if (!data || !data.nome) return horarios;
  if (data.tipo_posologia === 'custom' && data.horarios_custom) {
    horarios = [...data.horarios_custom];
  } else if (data.primeira_dose && data.intervalo && data.frequencia) {
    const [hh, mm] = data.primeira_dose.split(':').map(Number);
    const freq = parseInt(data.frequencia, 10);
    const intH = parseInt(data.intervalo, 10);
    for (let i = 0; i < freq; i++) {
      const h = hh + i * intH;
      if (h >= 24) break; // doses seguintes caem no dia seguinte
      horarios.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
  }
  return horarios.sort();
}

/** "1 colher(es) de chá", "2 comprimido(s)", "500 mg"... */
export function formatarDose(med) {
  if (!med || !med.dose_qtd) return '';
  return `${med.dose_qtd} ${med.dose_unidade || ''}`.trim();
}

/** calcularFrequenciaAutomatica: floor(24 / intervalo) */
export function calcularFrequencia(intervalo) {
  const v = parseFloat(intervalo);
  if (!v || v <= 0) return '';
  return String(Math.floor(24 / v));
}

export function isExpirado(med, dataIso = toLocalISODate()) {
  return !!(med && med.data_limite && dataIso > med.data_limite);
}

/** atualizarAdesaoMensal — retorna a porcentagem (0..100) */
export function calcularAdesaoMensal(maletaSlots, pulseiraTags) {
  const hoje = new Date();
  const mesAtual = toLocalISOMonth(hoje);
  const diaAtual = hoje.getDate();
  let totalDosesPorDia = 0;
  let dosesTomadasNoMes = 0;

  const contar = (ds) => {
    for (const key in ds) {
      const med = ds[key];
      if (!med || !med.nome) continue;
      totalDosesPorDia += getHorariosDoDia(med).length;
      if (med.historico_tomadas) {
        for (const doseKey in med.historico_tomadas) {
          if (doseKey.startsWith(mesAtual) && med.historico_tomadas[doseKey]?.tomado) {
            dosesTomadasNoMes++;
          }
        }
      }
    }
  };
  contar(maletaSlots);
  contar(pulseiraTags);

  const esperadas = totalDosesPorDia * diaAtual;
  if (esperadas <= 0) return 0;
  return Math.min(100, Math.round((dosesTomadasNoMes / esperadas) * 100));
}

/**
 * Parte de atualizarDashboard(): monta a timeline do dia selecionado.
 * Retorna { linhaTempo, totalDoses, totalTomadas }.
 */
export function montarTimeline(maletaSlots, pulseiraTags, dataSelecionada) {
  let totalDoses = 0;
  let totalTomadas = 0;
  const linhaTempo = [];
  const dataIso = toLocalISODate(dataSelecionada);

  const add = (ds, source, prefix) => {
    for (const key in ds) {
      const med = ds[key];
      if (!med || !med.nome) continue;
      if (med.data_limite && dataIso > med.data_limite) continue;

      const horarios = getHorariosDoDia(med);
      totalDoses += horarios.length;
      const idNum = key.split('_')[1];

      horarios.forEach((h) => {
        const reg = med.historico_tomadas?.[`${dataIso}_${h}`];
        const tomado = !!reg?.tomado;
        if (tomado) totalTomadas++;
        linhaTempo.push({
          key: `${prefix}_${idNum}_${h}`,
          hora: h,
          nome: med.nome,
          dose: formatarDose(med),
          tomado,
          sintomas: reg?.sintomas || '',
          source,
          id: idNum,
          prefix,
        });
      });
    }
  };

  add(maletaSlots, 'Maleta', 'maleta');
  add(pulseiraTags, 'Tags', 'pulseira');
  linhaTempo.sort((a, b) => a.hora.localeCompare(b.hora));
  return { linhaTempo, totalDoses, totalTomadas };
}

/** A hora da dose (data selecionada + HH:MM) já chegou? */
export function horaDaDoseChegou(dataSelecionada, hora) {
  const [h, m] = hora.split(':').map(Number);
  const d = new Date(dataSelecionada);
  d.setHours(h, m, 0, 0);
  return d <= new Date();
}

/** buscarMaisProximo — próxima dose (painel LED). */
export function buscarMaisProximo(dataSet) {
  let proxRemedio = 'Livre';
  let proxHora = '--:--';
  let menorDiff = Infinity;
  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const hojeIso = toLocalISODate(agora);

  for (const key in dataSet) {
    const med = dataSet[key];
    if (!med || !med.nome) continue;
    if (med.data_limite && hojeIso > med.data_limite) continue;
    for (const h of getHorariosDoDia(med)) {
      const [hh, mm] = h.split(':').map(Number);
      let diff = hh * 60 + mm - agoraMin;
      if (diff < 0) diff += 1440;
      if (diff > 0 && diff < menorDiff) {
        menorDiff = diff;
        proxHora = h;
        proxRemedio = med.nome;
      }
    }
  }
  return { hora: proxHora, nome: proxRemedio };
}

/** Medicamentos ativos (card Resumo de Saúde). */
export function listarMedicamentosAtivos(maletaSlots, pulseiraTags) {
  const hojeIso = toLocalISODate();
  const nomes = [];
  [maletaSlots, pulseiraTags].forEach((ds) => {
    for (const k in ds) {
      const m = ds[k];
      if (m && m.nome && !isExpirado(m, hojeIso)) nomes.push(m.nome);
    }
  });
  return nomes;
}

/** IDs numéricos das tags existentes, ordenados. */
export function getTagIds(pulseiraTags) {
  return Object.keys(pulseiraTags || {})
    .filter((k) => k.startsWith('tag_'))
    .map((k) => parseInt(k.replace('tag_', ''), 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
}

/**
 * Reproduz o getUniqueColor() do HTML de forma determinística:
 * a cada carregarDados() as cores eram zeradas e distribuídas na ordem
 * maleta (slots com remédio) -> tags (todas). Retorna { 'slot_1': 'c1', 'tag_2': 'c3', ... }
 */
export function montarMapaCores(maletaSlots, pulseiraTags) {
  let used = [];
  const next = () => {
    let available = colorPalette.filter((c) => !used.includes(c));
    if (available.length === 0) {
      used = [];
      available = colorPalette;
    }
    used.push(available[0]);
    return available[0];
  };
  const map = {};
  for (let i = 1; i <= SLOTS_MALETA; i++) {
    if (maletaSlots?.[`slot_${i}`]?.nome) map[`slot_${i}`] = next();
  }
  getTagIds(pulseiraTags).forEach((i) => {
    map[`tag_${i}`] = next();
  });
  return map;
}

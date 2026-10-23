// =====================================================
// DataContext — carregarDados() + setInterval(carregarDados, 3000)
// GET /api/dados devolve slots, tags, contatos e notificações no mesmo
// formato que o app lia do Firebase; tudo fica compartilhado entre as telas.
// =====================================================
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchDados, registrarNotificacao } from '../services/api';
import {
  agendarLembretesDoses,
  cancelarLembretesDoses,
  configurarSom,
  notificarAgora,
  pedirPermissao,
} from '../services/localNotifications';
import { getHorariosDoDia, montarMapaCores } from '../utils/doseHelpers';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);
const POLLING_MS = 3000;

/** "Assinatura" dos horários: só reagenda os lembretes quando algo muda. */
function assinaturaLembretes(maletaSlots, pulseiraTags, pushAtivo) {
  const partes = [];
  [maletaSlots, pulseiraTags].forEach((ds) => {
    Object.keys(ds || {})
      .sort()
      .forEach((k) => {
        const m = ds[k];
        if (m?.nome) partes.push([k, m.nome, m.dose_qtd, m.dose_unidade, m.data_limite, getHorariosDoDia(m).join(',')]);
      });
  });
  return JSON.stringify([pushAtivo, partes]);
}

export function DataProvider({ children }) {
  const { userId, user } = useAuth();
  const pushAtivo = user?.preferencias?.push !== false;
  const somAtivo = user?.preferencias?.som !== false;
  const ultimaAssinatura = useRef(null);
  const notifsVistas = useRef(null); // ids de notificações já conhecidos
  const [maletaSlots, setMaletaSlots] = useState({});
  const [pulseiraTags, setPulseiraTags] = useState({});
  const [listaContatos, setListaContatos] = useState({});
  const [notificacoesList, setNotificacoesList] = useState({});
  const [carregado, setCarregado] = useState(false);
  const emAndamento = useRef(false);

  const carregarDados = useCallback(async () => {
    if (!userId || emAndamento.current) return;
    emAndamento.current = true; // evita requisições sobrepostas no polling
    try {
      const data = await fetchDados();
      setMaletaSlots(data.slots_maleta || {});
      setPulseiraTags(data.tags_pulseira || {});
      setListaContatos(data.contatos || {});
      setNotificacoesList(data.notificacoes || {});
      setCarregado(true);
    } catch (e) {
      // Sem rede / servidor fora: mantém os últimos dados na tela
      // (no Firebase, um erro zerava tudo até a próxima leitura).
    } finally {
      emAndamento.current = false;
    }
  }, [userId]);

  // Polling a cada 3s (igual ao HTML). Diferença: pausa quando o app vai
  // para segundo plano — no navegador a aba inativa já era "estrangulada".
  useEffect(() => {
    if (!userId) {
      setMaletaSlots({});
      setPulseiraTags({});
      setListaContatos({});
      setNotificacoesList({});
      setCarregado(false);
      return undefined;
    }
    let timer = null;
    const start = () => {
      if (timer) return;
      carregarDados();
      timer = setInterval(carregarDados, POLLING_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const sub = AppState.addEventListener('change', (st) => (st === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, [userId, carregarDados]);

  // ---------------- Notificações locais ----------------
  // Ao entrar na conta: pede permissão (o Android/iOS mostra o diálogo uma vez)
  useEffect(() => {
    ultimaAssinatura.current = null;
    notifsVistas.current = null;
    if (userId) pedirPermissao().catch(() => {});
    else cancelarLembretesDoses().catch(() => {});
  }, [userId]);

  useEffect(() => {
    configurarSom(somAtivo);
  }, [somAtivo]);

  // Lembretes diários de dose: reagenda quando remédios/horários/preferência mudam
  useEffect(() => {
    if (!userId || !carregado) return;
    const assinatura = assinaturaLembretes(maletaSlots, pulseiraTags, pushAtivo);
    if (assinatura === ultimaAssinatura.current) return;
    ultimaAssinatura.current = assinatura;
    (pushAtivo ? agendarLembretesDoses(maletaSlots, pulseiraTags) : cancelarLembretesDoses()).catch((e) =>
      console.warn('Falha ao agendar lembretes:', e)
    );
  }, [userId, carregado, maletaSlots, pulseiraTags, pushAtivo]);

  // Dose confirmada pela maleta (ESP32): o servidor cria a notificação interna;
  // quando ela chega no polling, mostramos também como notificação do celular.
  useEffect(() => {
    if (!carregado) return;
    const ids = Object.keys(notificacoesList);
    if (notifsVistas.current === null) {
      notifsVistas.current = new Set(ids); // 1ª carga: não notifica o histórico
      return;
    }
    ids
      .filter((id) => !notifsVistas.current.has(id))
      .forEach((id) => {
        notifsVistas.current.add(id);
        const n = notificacoesList[id];
        if (pushAtivo && n?.titulo === 'Dose Registrada' && /ESP32/.test(n.mensagem || '')) {
          notificarAgora('✅ Maleta MedCase', n.mensagem, { data: { tipo: 'maleta' } }).catch(() => {});
        }
      });
  }, [carregado, notificacoesList, pushAtivo]);

  /**
   * Cria uma notificação a partir do app (POST /api/notificacoes) e recarrega.
   * A maioria das notificações (medicamento salvo, dose registrada, contato...)
   * agora é criada pelo próprio servidor; isto fica para eventos locais.
   */
  const notificar = useCallback(
    async (titulo, mensagem) => {
      try {
        await registrarNotificacao(titulo, mensagem);
      } catch (e) {
        // notificação interna é secundária: não interrompe o fluxo
      }
      carregarDados();
    },
    [carregarDados]
  );

  const colorMap = useMemo(() => montarMapaCores(maletaSlots, pulseiraTags), [maletaSlots, pulseiraTags]);

  const value = useMemo(
    () => ({
      maletaSlots,
      pulseiraTags,
      listaContatos,
      notificacoesList,
      colorMap,
      carregado,
      carregarDados,
      notificar,
    }),
    [maletaSlots, pulseiraTags, listaContatos, notificacoesList, colorMap, carregado, carregarDados, notificar]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>');
  return ctx;
}

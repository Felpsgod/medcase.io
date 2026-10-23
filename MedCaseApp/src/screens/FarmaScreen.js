// =====================================================
// FarmaScreen (#tab-farmaceuticos) — marketplace (prévia)
// Os profissionais vêm do backend (GET /api/farmaceuticos — tabela
// farmaceuticos, populada pelo init.py com os mesmos exemplos do HTML).
// O filtro é feito no aparelho para responder na hora enquanto digita.
// =====================================================
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import FarmaCard from '../components/FarmaCard';
import Icon from '../components/Icon';
import { Input, SelectField } from '../components/Form';
import FarmaModal from '../modals/FarmaModal';
import { listarFarmaceuticos } from '../services/api';
import { colors, fonts, sizes } from '../theme';

const ESPECIALIDADES = [
  { value: '', label: 'Todas as especialidades' },
  'Atenção ao idoso',
  'Saúde da mulher',
  'Diabetes & hipertensão',
  'Pediatria',
];

export default function FarmaScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width <= sizes.breakpointMobile;
  const [busca, setBusca] = useState('');
  const [esp, setEsp] = useState('');
  const [agendando, setAgendando] = useState(null); // farmacêutico selecionado
  const [gridW, setGridW] = useState(0);
  const [farmaceuticos, setFarmaceuticos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setFarmaceuticos(await listarFarmaceuticos());
      setErro('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  // renderFarmaceuticos(): filtro por especialidade + busca por nome/especialidade
  const lista = useMemo(() => {
    const b = busca.toLowerCase();
    return farmaceuticos.filter(
      (f) => (!esp || f.esp === esp) && (!b || f.nome.toLowerCase().includes(b) || f.esp.toLowerCase().includes(b))
    );
  }, [farmaceuticos, busca, esp]);

  const cols = width <= sizes.breakpointSmall ? 1 : Math.max(1, Math.floor((gridW + 20) / 300));
  const itemW = gridW ? (gridW - 20 * (cols - 1)) / cols : '100%';

  return (
    <Screen onRefresh={carregar}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { fontSize: isMobile ? 22 : 28 }]}>Farmacêuticos</Text>
        <Text style={styles.soon}>EM BREVE</Text>
      </View>
      <Text style={styles.sub}>Tire dúvidas sobre seus medicamentos com um farmacêutico, por chamada de vídeo ou chat.</Text>

      <View style={styles.filtros}>
        <Input
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome ou especialidade..."
          style={styles.filtroInput}
        />
        <SelectField value={esp} options={ESPECIALIDADES} onChange={setEsp} style={{ flex: 1, minWidth: 180 }} />
      </View>

      <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
        {carregando ? (
          <ActivityIndicator color={colors.green} style={{ flex: 1, paddingVertical: 30 }} />
        ) : erro && farmaceuticos.length === 0 ? (
          <Text style={styles.empty}>{erro}</Text>
        ) : lista.length === 0 ? (
          <Text style={styles.empty}>Nenhum farmacêutico encontrado com esses filtros.</Text>
        ) : (
          lista.map((f) => (
            <View key={f.id} style={{ width: itemW }}>
              <FarmaCard farma={f} onAgendar={() => setAgendando(f)} />
            </View>
          ))
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          <Icon name="circle-info" size={13} color={colors.green} /> Esta é uma <Text style={{ fontFamily: fonts.interBold }}>prévia (esboço)</Text> do módulo de
          consultas. Os profissionais acima são exemplos. Os pedidos de agendamento já ficam registrados; pagamento e atendimento por vídeo/chat chegam em breve.
        </Text>
      </View>

      <FarmaModal visible={!!agendando} farma={agendando} onClose={() => setAgendando(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 },
  title: { fontFamily: fonts.poppinsExtra, color: colors.textDark },
  soon: {
    fontFamily: fonts.interBold,
    fontSize: 11,
    backgroundColor: colors.peachAlt2,
    color: '#7a4b00',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sub: { fontFamily: fonts.inter, color: colors.textMid, fontSize: 14 },
  filtros: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-start', zIndex: 10 },
  filtroInput: { flex: 1, minWidth: 180, width: undefined, backgroundColor: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  empty: { fontFamily: fonts.inter, color: colors.textSoft, fontSize: 14 },
  info: {
    marginTop: 24,
    backgroundColor: 'rgba(4,191,138,0.06)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.green,
    borderRadius: sizes.radiusLg,
    padding: 20,
  },
  infoText: { fontFamily: fonts.inter, color: colors.textMid, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

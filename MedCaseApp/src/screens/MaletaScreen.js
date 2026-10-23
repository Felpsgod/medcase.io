// =====================================================
// MaletaScreen (#view-maleta-interna) — 6 nichos + display LED
// =====================================================
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Screen from '../components/Screen';
import SlotCard from '../components/SlotCard';
import LedPanel from '../components/LedPanel';
import { BackButton, PageHeading } from '../components/Card';
import SlotModal from '../modals/SlotModal';
import { useData } from '../contexts/DataContext';
import { SLOTS_MALETA, buscarMaisProximo } from '../utils/doseHelpers';
import { colors, fonts, shadows, sizes } from '../theme';

const GAP = 16;
const MIN_COL = 180; // grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))

export default function MaletaScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width <= sizes.breakpointMobile;
  const { maletaSlots, colorMap, carregarDados } = useData();
  const [gridW, setGridW] = useState(0);
  const [modal, setModal] = useState(null); // { id, isEdit }

  const prox = useMemo(() => buscarMaisProximo(maletaSlots), [maletaSlots]);
  const cols = isMobile ? 1 : Math.max(1, Math.floor((gridW + GAP) / (MIN_COL + GAP)));
  const itemW = gridW ? (gridW - GAP * (cols - 1)) / cols : '100%';

  return (
    <Screen onRefresh={carregarDados}>
      <PageHeading>Maleta Inteligente</PageHeading>
      <View style={styles.innerHeader}>
        <Text style={styles.innerInfo}>{SLOTS_MALETA} compartimentos disponíveis</Text>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={[styles.maleta, isMobile && { padding: 15, marginTop: 30 }]}>
        {/* Alça da maleta (::before) */}
        <View style={styles.handle} />
        <View style={styles.foam}>
          <LedPanel label="Próxima Dose • Maleta" hora={prox.hora} nome={prox.nome} />
          <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
            {Array.from({ length: SLOTS_MALETA }, (_, k) => k + 1).map((i) => {
              const data = maletaSlots[`slot_${i}`];
              return (
                <View key={i} style={{ width: itemW }}>
                  <SlotCard
                    index={i}
                    data={data}
                    colorKey={colorMap[`slot_${i}`]}
                    onPress={() => setModal({ id: i, isEdit: !!data?.nome })}
                    style={{ flexGrow: 1 }}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <SlotModal
        visible={!!modal}
        onClose={() => setModal(null)}
        id={modal?.id}
        isEdit={modal?.isEdit}
        tipo="maleta"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  innerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 22, marginTop: -10 },
  innerInfo: { fontFamily: fonts.interSemi, fontSize: 14, color: colors.textMid },
  maleta: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 32,
    marginTop: 40,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  handle: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -70,
    width: 140,
    height: 20,
    backgroundColor: colors.white,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  foam: { backgroundColor: colors.bg, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
});

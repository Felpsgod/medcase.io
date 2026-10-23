// =====================================================
// TagsScreen (#view-pulseiras-interna) — tags ilimitadas + "Nova Tag"
// =====================================================
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Screen from '../components/Screen';
import WatchCard from '../components/WatchCard';
import LedPanel from '../components/LedPanel';
import Icon from '../components/Icon';
import { BackButton, PageHeading } from '../components/Card';
import SlotModal from '../modals/SlotModal';
import { useData } from '../contexts/DataContext';
import { buscarMaisProximo, getTagIds } from '../utils/doseHelpers';
import { colors, fonts, shadows, sizes } from '../theme';

export default function TagsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width <= sizes.breakpointMobile;
  const isSmall = width <= sizes.breakpointSmall;
  const { pulseiraTags, colorMap, carregarDados } = useData();
  const [gridW, setGridW] = useState(0);
  const [modal, setModal] = useState(null);

  const prox = useMemo(() => buscarMaisProximo(pulseiraTags), [pulseiraTags]);
  const ids = useMemo(() => getTagIds(pulseiraTags), [pulseiraTags]);
  const nextId = (ids.length ? Math.max(...ids) : 0) + 1;

  // repeat(auto-fit, minmax(140px,1fr)); em telas <=480: 2 colunas
  const gap = isSmall ? 12 : 20;
  const cols = isSmall ? 2 : Math.max(1, Math.floor((gridW + gap) / ((isMobile ? 130 : 140) + gap)));
  const cellW = gridW ? (gridW - gap * (cols - 1)) / cols : 150;
  const watchW = Math.min(150, cellW);

  return (
    <Screen onRefresh={carregarDados}>
      <PageHeading>Tags de Frasco</PageHeading>
      <View style={styles.innerHeader}>
        <Text style={styles.innerInfo}>Hub Central de Conexão</Text>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={[styles.dock, isMobile && { padding: 18 }]}>
        <View style={styles.indicator}>
          <Icon name="wifi" size={12} color={colors.green} />
          <Text style={styles.indicatorText}>Sincronizado</Text>
        </View>
        <View style={{ marginTop: 20 }}>
          <LedPanel variant="pulseira" label="Próxima Dose • Tags" hora={prox.hora} nome={prox.nome} />
        </View>

        <View style={[styles.grid, { gap }]} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
          {ids.map((i) => (
            <View key={i} style={[styles.cell, { width: cellW }]}>
              <WatchCard
                id={i}
                data={pulseiraTags[`tag_${i}`]}
                colorKey={colorMap[`tag_${i}`]}
                width={watchW}
                onPress={() => setModal({ id: i, isEdit: !!pulseiraTags[`tag_${i}`]?.nome })}
              />
            </View>
          ))}
          <View style={[styles.cell, { width: cellW }]}>
            <WatchCard isAdd width={watchW} onPress={() => setModal({ id: nextId, isEdit: false })} />
          </View>
        </View>
      </View>

      <SlotModal visible={!!modal} onClose={() => setModal(null)} id={modal?.id} isEdit={modal?.isEdit} tipo="pulseira" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  innerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 22, marginTop: -10 },
  innerInfo: { fontFamily: fonts.interSemi, fontSize: 14, color: colors.textMid },
  dock: {
    backgroundColor: colors.white,
    padding: 30,
    borderRadius: sizes.radiusLg,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  indicator: { position: 'absolute', top: 15, right: 25, flexDirection: 'row', alignItems: 'center', gap: 8 },
  indicatorText: { fontFamily: fonts.interBold, fontSize: 12, color: colors.textMid },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center' },
});

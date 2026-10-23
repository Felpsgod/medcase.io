// =====================================================
// Tag de frasco (.watch-wrapper) — "relógio" com pulseira colorida
// Variantes: preenchida, vazia, e o card "Nova Tag" (isAdd)
// =====================================================
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import HoraAMPM from './HoraAMPM';
import { colors, fonts, gradients, GRAD_START, GRAD_END } from '../theme';
import { formatarDose, getHorariosDoDia, isExpirado } from '../utils/doseHelpers';

function Strap({ position, colorKey }) {
  const style = [styles.strap, position === 'top' ? styles.strapTop : styles.strapBottom];
  if (!colorKey) return <View style={[style, { backgroundColor: colors.border }]} />;
  return <LinearGradient colors={gradients[colorKey]} start={GRAD_START} end={GRAD_END} style={style} />;
}

function WPill({ icon, children, danger }) {
  return (
    <View style={[styles.wPill, danger && { backgroundColor: colors.pinkDark }]}>
      <Icon name={icon} size={8} color={danger ? colors.white : colors.textMid} />
      <Text style={[styles.wPillText, danger && { color: colors.white }]}>{children}</Text>
    </View>
  );
}

export default function WatchCard({ id, data, colorKey, onPress, isAdd = false, width = 150 }) {
  const wrap = ({ pressed }) => [styles.wrapper, { width }, pressed && { transform: [{ translateY: -4 }, { scale: 1.02 }] }];

  if (isAdd) {
    return (
      <Pressable onPress={onPress} style={wrap}>
        <Strap position="top" />
        <View style={[styles.body, styles.bodyAdd]}>
          <View style={styles.emptyState}>
            <View style={[styles.plus, { width: 34, height: 34, marginBottom: 8 }]}>
              <Icon name="plus" size={13} color="#aaa" />
            </View>
            <Text style={styles.addText}>Nova Tag</Text>
          </View>
        </View>
        <Strap position="bottom" />
      </Pressable>
    );
  }

  if (!data?.nome) {
    return (
      <Pressable onPress={onPress} style={wrap}>
        <Strap position="top" />
        <View style={[styles.body, styles.bodyEmpty]}>
          <Text style={styles.tagLabel}>TAG {id}</Text>
          <View style={[styles.emptyState, { marginTop: 15 }]}>
            <View style={[styles.plus, { width: 28, height: 28 }]}>
              <Icon name="plus" size={11} color="#aaa" />
            </View>
          </View>
        </View>
        <Strap position="bottom" />
      </Pressable>
    );
  }

  const expirado = isExpirado(data);
  const dose = formatarDose(data);

  return (
    <Pressable onPress={onPress} style={(s) => [wrap(s), expirado && { opacity: 0.6 }]}>
      <Strap position="top" colorKey={colorKey} />
      <View style={styles.body}>
        <View style={styles.gloss} pointerEvents="none" />
        <Pressable style={styles.editBtn} onPress={onPress} hitSlop={6}>
          <Icon name="pen" size={8} color={colors.textSoft} />
        </Pressable>
        <Text style={styles.tagLabel}>TAG {id}</Text>
        <View style={styles.center}>
          <Icon name="tag" size={22} color={colors.pinkDark} style={{ marginBottom: 5 }} />
          <Text style={styles.medName} numberOfLines={2}>{data.nome}</Text>
          <View style={styles.timerBox}>
            {getHorariosDoDia(data).map((h) => (
              <HoraAMPM key={h} hora={h} size={11} iconSize={9} color={colors.lime} />
            ))}
          </View>
        </View>
        <View style={styles.pills}>
          <WPill icon="rotate-right">{data.frequencia}x</WPill>
          {!!dose && <WPill icon="prescription-bottle-medical">{dose}</WPill>}
          <WPill icon="clock">{data.tipo_posologia === 'custom' ? 'Manual' : 'Fixo'}</WPill>
          {expirado && (
            <WPill icon="check" danger>
              Fim
            </WPill>
          )}
        </View>
      </View>
      <Strap position="bottom" colorKey={colorKey} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  strap: { width: 85, height: 20 },
  strapTop: { borderTopLeftRadius: 12, borderTopRightRadius: 12, marginBottom: -3 },
  strapBottom: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -3 },
  body: {
    width: '100%',
    minHeight: 165,
    backgroundColor: colors.white,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: colors.bg,
    paddingVertical: 14,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  bodyEmpty: { backgroundColor: colors.bg, borderColor: colors.border },
  bodyAdd: { backgroundColor: colors.white, borderColor: colors.border, justifyContent: 'center' },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  editBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  tagLabel: { fontFamily: fonts.interBold, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.textSoft, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 8 },
  medName: { fontFamily: fonts.poppinsBold, fontSize: 13, color: colors.textDark, textAlign: 'center', lineHeight: 15, marginTop: 4 },
  timerBox: {
    backgroundColor: colors.dark,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: 8 },
  wPill: {
    backgroundColor: colors.bg,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  wPillText: { fontFamily: fonts.interSemi, fontSize: 9, color: colors.textMid },
  emptyState: { alignItems: 'center', justifyContent: 'center' },
  plus: { borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.interSemi, color: '#888', fontSize: 13 },
});

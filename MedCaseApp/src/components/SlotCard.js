// =====================================================
// Card de nicho da Maleta (.slot-card) — com gradiente único por slot
// =====================================================
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import HoraAMPM from './HoraAMPM';
import { colors, fonts, gradients, GRAD_START, GRAD_END, sizes } from '../theme';
import { formatarDose, getHorariosDoDia, isExpirado } from '../utils/doseHelpers';

function Pill({ icon, children, bg }) {
  return (
    <View style={[styles.pill, bg && { backgroundColor: bg }]}>
      <Icon name={icon} size={9} color={colors.white} />
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

export default function SlotCard({ index, data, colorKey = 'c1', onPress, style }) {
  if (!data?.nome) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, styles.empty, pressed && styles.emptyHover, style]}>
        {({ pressed }) => (
          <>
            <View style={styles.top}>
              <Text style={[styles.num, styles.numEmpty]}>Nicho {index}</Text>
            </View>
            <View style={styles.emptyState}>
              <View style={[styles.plus, pressed && { borderColor: colors.green, backgroundColor: colors.white }]}>
                <Icon name="plus" size={13} color={pressed ? colors.green : '#aaa'} />
              </View>
              <Text style={styles.emptyText}>Configurar</Text>
            </View>
          </>
        )}
      </Pressable>
    );
  }

  const expirado = isExpirado(data);
  const dose = formatarDose(data);
  const horarios = getHorariosDoDia(data);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { transform: [{ translateY: -3 }, { scale: 1.01 }] }, style]}>
      <LinearGradient
        colors={gradients[colorKey] || gradients.c1}
        start={GRAD_START}
        end={GRAD_END}
        // "Tratamento finalizado": opacity .6 (grayscale do CSS não tem equivalente universal no RN)
        style={[styles.card, expirado && { opacity: 0.6 }]}
      >
        {expirado && <View style={[StyleSheet.absoluteFill, styles.grayOverlay]} pointerEvents="none" />}
        <View style={styles.top}>
          <Text style={styles.num}>Nicho {index}</Text>
          <Pressable style={styles.editBtn} onPress={onPress} hitSlop={6}>
            <Icon name="pen" size={10} color={colors.dark} />
          </Pressable>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.medName}>{data.nome}</Text>
          <View style={styles.details}>
            <View style={styles.pillsRow}>
              <Pill icon="rotate-right">{data.frequencia}x</Pill>
              {!!dose && <Pill icon="prescription-bottle-medical">{dose}</Pill>}
              {!!data.uso_continuo && <Pill icon="infinity">Contínuo</Pill>}
              {expirado && (
                <Pill icon="triangle-exclamation" bg={colors.pinkDark}>
                  Tratamento Finalizado
                </Pill>
              )}
            </View>
            <View style={styles.timesList}>
              {horarios.map((h) => (
                <View key={h} style={styles.timeChip}>
                  <HoraAMPM hora={h} size={12} color={colors.white} />
                </View>
              ))}
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: sizes.radiusMd,
    padding: 18,
    minHeight: 140,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  empty: { backgroundColor: colors.white, borderWidth: 2, borderStyle: 'dashed', borderColor: '#ccc' },
  emptyHover: { borderColor: colors.green, backgroundColor: 'rgba(4,191,138,0.05)' },
  grayOverlay: { backgroundColor: 'rgba(128,128,128,0.35)' },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, zIndex: 2 },
  num: {
    fontFamily: fonts.interBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.dark,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  numEmpty: { backgroundColor: colors.bg, color: colors.textSoft },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { flex: 1, justifyContent: 'flex-end', zIndex: 2 },
  medName: {
    fontFamily: fonts.poppinsBold,
    fontSize: 17,
    color: colors.white,
    marginBottom: 8,
    lineHeight: 21,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  details: { gap: 5 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  pillText: { fontFamily: fonts.interSemi, fontSize: 10, color: colors.white },
  timesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  timeChip: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  plus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontFamily: fonts.inter, fontSize: 14, color: colors.textSoft },
});

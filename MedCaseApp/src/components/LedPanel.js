// =====================================================
// Display LED da próxima dose (.led-panel-internal)
// variant 'maleta' (largo) | 'pulseira' (compacto, centralizado)
// =====================================================
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import HoraAMPM from './HoraAMPM';
import { colors, fonts, sizes } from '../theme';

export default function LedPanel({ label, hora, nome, variant = 'maleta' }) {
  const { width } = useWindowDimensions();
  const coluna = variant === 'pulseira' || width <= sizes.breakpointMobile;

  return (
    <View style={[styles.panel, coluna && styles.panelColumn, variant === 'pulseira' && styles.pulseira]}>
      <View style={[styles.left, coluna && { alignItems: 'center' }]}>
        <Text style={styles.label}>{label}</Text>
        <HoraAMPM hora={hora === '--:--' ? null : hora} size={24} iconSize={18} color={colors.lime} textStyle={styles.time} />
      </View>
      <Text style={[styles.med, coluna && { textAlign: 'center' }]} numberOfLines={1}>
        {nome || 'Aguardando Sist.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.dark,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    // inset shadow não existe no RN: borda interna escura simula a profundidade
    borderWidth: 2,
    borderColor: '#0d0d0d',
  },
  panelColumn: { flexDirection: 'column', justifyContent: 'center' },
  pulseira: { maxWidth: 260, width: '100%', alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20, gap: 6 },
  left: {},
  label: { fontFamily: fonts.inter, fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 },
  time: {
    color: colors.lime,
    textShadowColor: 'rgba(171,209,100,0.4)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  med: { fontFamily: fonts.interMedium, fontSize: 15, color: colors.white, textAlign: 'right', flexShrink: 1 },
});

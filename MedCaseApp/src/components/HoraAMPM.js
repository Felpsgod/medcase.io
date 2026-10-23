// =====================================================
// Renderiza formatarHoraAMPM(): ícone de lua (18h–6h) ou sol + "08:00 AM"
// =====================================================
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors, fonts } from '../theme';
import { formatarHoraAMPM } from '../utils/dateHelpers';

export default function HoraAMPM({ hora, color = colors.textMid, size = 13, iconSize, style, textStyle, fallback = '--:--' }) {
  const f = formatarHoraAMPM(hora);
  if (!f) return <Text style={[styles.text, { color, fontSize: size }, textStyle]}>{fallback}</Text>;
  return (
    <View style={[styles.row, style]}>
      <Icon
        name={f.isNight ? 'moon' : 'sun'}
        size={iconSize || size * 0.85}
        color={f.isNight ? colors.moon : colors.sun}
      />
      <Text style={[styles.text, { color, fontSize: size }, textStyle]}>{f.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  text: { fontFamily: fonts.mono },
});

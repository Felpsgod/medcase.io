// =====================================================
// Blocos visuais genéricos: .dash-card, .dash-card-title,
// .page-heading, .page-sub, .btn-back
// =====================================================
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Icon from './Icon';
import { colors, fonts, shadows, sizes } from '../theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardTitle({ children, icon, iconColor = colors.pinkDark }) {
  return (
    <View style={styles.cardTitleRow}>
      {!!icon && <Icon name={icon} size={13} color={iconColor} />}
      <Text style={styles.cardTitle}>{children}</Text>
    </View>
  );
}

export function PageHeading({ children, right, style }) {
  const { width } = useWindowDimensions();
  const fontSize = width <= sizes.breakpointSmall ? 20 : width <= sizes.breakpointMobile ? 22 : 28;
  return (
    <View style={[styles.headingRow, style]}>
      <Text style={[styles.heading, { fontSize }]}>{children}</Text>
      {right}
    </View>
  );
}

export function PageSub({ children, style }) {
  return <Text style={[styles.sub, style]}>{children}</Text>;
}

export function BackButton({ onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.bg }]}>
      <Icon name="arrow-left" size={13} color={colors.textDark} />
      <Text style={styles.backText}>Voltar</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: sizes.radiusLg, padding: 24, overflow: 'hidden', ...shadows.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  cardTitle: {
    fontFamily: fonts.interSemi,
    fontSize: 13,
    color: colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  heading: { fontFamily: fonts.poppinsExtra, color: colors.textDark, flexShrink: 1 },
  sub: { fontFamily: fonts.inter, color: colors.textMid, fontSize: 14, marginTop: -15, marginBottom: 24 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 18,
    backgroundColor: colors.white,
    borderRadius: sizes.radiusSm,
    ...shadows.sm,
  },
  backText: { fontFamily: fonts.interSemi, fontSize: 14, color: colors.textDark },
});

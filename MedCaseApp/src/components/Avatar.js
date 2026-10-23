// =====================================================
// Avatar circular com gradiente (.user-avatar / .profile-pic-container)
// Mostra a foto (base64/uri) ou as iniciais.
// =====================================================
import React from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, gradients, GRAD_START, GRAD_END } from '../theme';

export function iniciais(nome) {
  const first = String(nome || '').trim().split(' ')[0] || '';
  return first.substring(0, 2).toUpperCase() || '--';
}

export default function Avatar({ nome, foto, size = 34, fontSize, gradient = gradients.c2, style }) {
  return (
    <LinearGradient
      colors={gradient}
      start={GRAD_START}
      end={GRAD_END}
      style={[{ width: size, height: size, borderRadius: size / 2 }, styles.wrap, style]}
    >
      {foto ? (
        <Image source={{ uri: foto }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.text, { fontSize: fontSize || size * 0.36 }]}>{iniciais(nome)}</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { color: colors.white, fontFamily: fonts.interBold },
});

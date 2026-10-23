// =====================================================
// Dropdown "glassmorphism" (.dropdown-menu) — notificações e perfil.
// No HTML era um <div> absoluto fechado por click no document.
// Aqui: Modal transparente (fecha ao tocar fora) + BlurView.
// =====================================================
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Icon from './Icon';
import { colors, fonts, shadows, sizes } from '../theme';

export default function Dropdown({ visible, onClose, top = 70, children }) {
  const { width, height } = useWindowDimensions();
  const isMobile = width <= sizes.breakpointMobile;
  // Mobile: ocupa quase toda a largura (left/right 12). Desktop: 280px à direita.
  const pos = isMobile ? { left: 12, right: 12 } : { right: 40, width: 300 };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.menu, pos, { top, maxHeight: isMobile ? height * 0.7 : 400 }]}>
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.glass]} />
        <ScrollView contentContainerStyle={{ padding: 10 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function DropdownItem({ icon, label, onPress, danger }) {
  const c = danger ? colors.pinkDark : colors.textDark;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        danger && { marginTop: 4 },
        pressed && { backgroundColor: danger ? 'rgba(242,114,197,0.1)' : 'rgba(0,0,0,0.04)' },
      ]}
    >
      <Icon name={icon} size={15} color={danger ? colors.pinkDark : colors.textMid} style={{ width: 18, textAlign: 'center' }} />
      <Text style={[styles.itemText, { color: c }]}>{label}</Text>
    </Pressable>
  );
}

export function DropdownDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    ...shadows.dropdown,
  },
  glass: { backgroundColor: 'rgba(255,255,255,0.92)' },
  item: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 12 },
  itemText: { fontFamily: fonts.interMedium, fontSize: 15 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 4, marginHorizontal: 10 },
});

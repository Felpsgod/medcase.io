// =====================================================
// Card de contato de acompanhamento (.contact-card)
// =====================================================
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, fonts, shadows, sizes } from '../theme';

export default function ContactCard({ contato, onEdit, onDelete }) {
  const isMed = contato.tipo === 'Médico';
  const cor = isMed ? colors.green : colors.orange;

  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: cor }]}>
        <Icon name={isMed ? 'user-doctor' : 'house'} size={17} color={colors.white} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.type, { color: cor }]}>{contato.tipo}</Text>
        <Text style={styles.name} numberOfLines={1}>{contato.nome}</Text>
        <View style={styles.phoneRow}>
          <Icon name="whatsapp" brand size={13} color={colors.textMid} />
          <Text style={styles.phone}>{contato.telefone}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={({ pressed }) => [styles.actBtn, pressed && { backgroundColor: 'rgba(4,191,138,0.1)' }]} onPress={onEdit} hitSlop={4}>
          <Icon name="pen" size={13} color={colors.green} />
        </Pressable>
        <Pressable style={({ pressed }) => [styles.actBtn, pressed && { backgroundColor: '#ffe4eb' }]} onPress={onDelete} hitSlop={4}>
          <Icon name="trash" size={13} color={colors.pinkDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: sizes.radiusLg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  type: { fontFamily: fonts.interBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  name: { fontFamily: fonts.poppinsBold, fontSize: 16, color: colors.textDark },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  phone: { fontFamily: fonts.inter, fontSize: 13, color: colors.textMid },
  actions: { flexDirection: 'row', gap: 8 },
  actBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});

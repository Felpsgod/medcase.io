// =====================================================
// Item de notificação (.notif-item) — usado no dropdown e na tela de Alertas
// =====================================================
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, shadows } from '../theme';
import { formatarDataHora } from '../utils/dateHelpers';

export default function NotifItem({ notif, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>{notif.titulo}</Text>
        <Text style={styles.badge}>{formatarDataHora(notif.data)}</Text>
      </View>
      <Text style={styles.msg}>{notif.mensagem}</Text>
    </Pressable>
  );
}

/** Object.values(notificacoesList) ordenado do mais recente para o mais antigo */
export function ordenarNotificacoes(lista) {
  return Object.entries(lista || {})
    .map(([id, n]) => ({ id, ...(n || {}) }))
    .sort((a, b) => new Date(b.data) - new Date(a.data));
}

const styles = StyleSheet.create({
  item: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 5,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
    ...shadows.sm,
  },
  pressed: { borderColor: colors.green, backgroundColor: '#f9fdfb', transform: [{ scale: 1.01 }] },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.interBold, fontSize: 14, color: colors.textDark, flex: 1 },
  badge: {
    fontFamily: fonts.inter,
    fontSize: 10,
    color: colors.textSoft,
    backgroundColor: colors.bg,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  msg: { fontFamily: fonts.inter, fontSize: 12, color: colors.textMid, lineHeight: 16 },
});

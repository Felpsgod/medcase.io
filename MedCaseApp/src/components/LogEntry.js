// =====================================================
// Linha de log do ESP32 (.log-entry + .log-badge.<TIPO>)
// =====================================================
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { formatarHoraCompleta } from '../utils/dateHelpers';

export default function LogEntry({ log }) {
  const tipo = log.tipo || 'INFO';
  const badge = colors.log[tipo] || colors.log.INFO;
  return (
    <View style={styles.entry}>
      <Text style={styles.time}>{formatarHoraCompleta(log.timestamp)}</Text>
      <Text style={[styles.badge, { backgroundColor: badge.bg, color: badge.fg }]}>{tipo}</Text>
      <Text style={styles.msg}>{log.mensagem || 'Sem mensagem'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  entry: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  time: { color: '#666', minWidth: 64, fontSize: 12, fontFamily: fonts.mono },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: fonts.interBold,
    minWidth: 60,
    textAlign: 'center',
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  msg: { color: '#e0e0e0', flex: 1, fontFamily: fonts.mono, fontSize: 13 },
});

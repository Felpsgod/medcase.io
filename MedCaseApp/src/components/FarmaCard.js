// =====================================================
// Card do marketplace de farmacêuticos (.farma-card) — esboço/mock
// =====================================================
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Avatar from './Avatar';
import Icon from './Icon';
import { Button } from './Form';
import { colors, fonts, shadows, sizes } from '../theme';

// A API devolve preco/nota como números (49, 4.9)
const formatarPreco = (p) => {
  const n = Number(p);
  if (isNaN(n)) return String(p ?? '');
  return `R$ ${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')}`;
};
const formatarNota = (n) => (isNaN(Number(n)) ? String(n ?? '') : Number(n).toFixed(1));

export default function FarmaCard({ farma, onAgendar }) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Avatar nome={farma.iniciais} size={56} fontSize={19} />
        <View style={{ flex: 1 }}>
          <Text style={styles.nome}>{farma.nome}</Text>
          <Text style={styles.crf}>{farma.crf}</Text>
        </View>
      </View>
      <Text style={styles.esp}>{farma.esp}</Text>
      <View style={styles.meta}>
        <Text style={styles.preco}>
          {formatarPreco(farma.preco)} <Text style={styles.precoSub}>/ consulta</Text>
        </Text>
        <View style={styles.notaRow}>
          <Icon name="star" size={12} color={colors.orange} />
          <Text style={styles.nota}>{formatarNota(farma.nota)}</Text>
        </View>
      </View>
      <Button title="Agendar consulta" icon="calendar-plus" onPress={onAgendar} style={{ flex: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: sizes.radiusLg,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    ...shadows.sm,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nome: { fontFamily: fonts.poppinsBold, fontSize: 16, color: colors.textDark },
  crf: { fontFamily: fonts.inter, fontSize: 12, color: colors.textSoft },
  esp: {
    alignSelf: 'flex-start',
    fontFamily: fonts.interSemi,
    fontSize: 12,
    color: colors.green,
    backgroundColor: 'rgba(4,191,138,0.1)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  preco: { fontFamily: fonts.interBold, fontSize: 13, color: colors.textDark },
  precoSub: { fontFamily: fonts.inter, color: colors.textSoft },
  notaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nota: { fontFamily: fonts.interSemi, fontSize: 13, color: colors.orange },
});

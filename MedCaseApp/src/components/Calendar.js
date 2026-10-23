// =====================================================
// Calendário semanal interativo (renderCalendar / mudarSemana)
// =====================================================
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, fonts, shadows } from '../theme';
import { diasSemana, inicioDaSemana, mesNomes } from '../utils/dateHelpers';

export default function Calendar({ dataAtualBase, dataSelecionada, onSelect, onChangeWeek }) {
  const start = inicioDaSemana(dataAtualBase);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const hoje = new Date().toDateString();

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.month}>{`${mesNomes[start.getMonth()]} ${start.getFullYear()}`}</Text>
        <View style={styles.navBtns}>
          <Pressable style={({ pressed }) => [styles.btn, pressed && { backgroundColor: colors.green }]} onPress={() => onChangeWeek(-1)}>
            <Icon name="chevron-left" size={10} color={colors.white} />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.btn, pressed && { backgroundColor: colors.green }]} onPress={() => onChangeWeek(1)}>
            <Icon name="chevron-right" size={10} color={colors.white} />
          </Pressable>
        </View>
      </View>

      <View style={styles.row}>
        {diasSemana.map((d) => (
          <Text key={d} style={styles.dayName}>{d}</Text>
        ))}
      </View>

      <View style={styles.row}>
        {dias.map((d) => {
          const active = d.toDateString() === dataSelecionada.toDateString();
          const isHoje = d.toDateString() === hoje;
          return (
            <View key={d.toISOString()} style={styles.cell}>
              <Pressable
                onPress={() => onSelect(new Date(d))}
                style={({ pressed }) => [styles.num, pressed && !active && { backgroundColor: colors.bg }, active && styles.numActive]}
              >
                <Text style={[styles.numText, isHoje && !active && { color: colors.green }, active && { color: colors.white }]}>
                  {d.getDate()}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  month: { fontFamily: fonts.poppinsBold, fontSize: 16, color: colors.textDark },
  navBtns: { flexDirection: 'row', gap: 10 },
  btn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', marginBottom: 12 },
  dayName: { flex: 1, textAlign: 'center', fontFamily: fonts.interBold, fontSize: 11, color: colors.textSoft },
  cell: { flex: 1, alignItems: 'center' },
  num: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  numActive: { backgroundColor: colors.green, ...shadows.green },
  numText: { fontFamily: fonts.interSemi, fontSize: 14, color: colors.textMid },
});

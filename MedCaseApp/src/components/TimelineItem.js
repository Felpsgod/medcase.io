// =====================================================
// Item da agenda/timeline estilo Teams (.timeline-item + .event-card)
// Estados: tomado (check), hora chegou (botão Registrar), futuro (Programado)
// =====================================================
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import HoraAMPM from './HoraAMPM';
import { colors, fonts, timelineColors } from '../theme';
import { horaDaDoseChegou } from '../utils/doseHelpers';

export default function TimelineItem({ ev, index, dataSelecionada, onRegistrar }) {
  const tl = timelineColors[index % timelineColors.length];
  const chegou = horaDaDoseChegou(dataSelecionada, ev.hora);

  let acao;
  if (ev.tomado) {
    acao = <Icon name="circle-check" size={20} color={colors.green} />;
  } else if (chegou) {
    acao = (
      <Pressable
        onPress={() => onRegistrar(ev)}
        style={({ pressed }) => [styles.btnTomar, pressed && { backgroundColor: colors.green }]}
      >
        <Text style={styles.btnTomarText}>Registrar</Text>
      </Pressable>
    );
  } else {
    acao = (
      <View style={styles.programado}>
        <Icon name="calendar-day" size={10} color="#aaa" />
        <Text style={styles.programadoText}>Programado</Text>
      </View>
    );
  }

  return (
    <View style={styles.item}>
      <View style={styles.dot} />
      <HoraAMPM hora={ev.hora} size={13} style={styles.time} />
      <View
        style={[
          styles.card,
          { borderLeftColor: tl.border, backgroundColor: colors.white },
          ev.tomado && styles.taken,
        ]}
      >
        {/* fundo em degradê suave (linear-gradient 90deg cor -> branco) aproximado com cor sólida translúcida */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tl.bg }]} pointerEvents="none" />
        <View style={styles.info}>
          <Text style={styles.nome} numberOfLines={1}>{ev.nome}</Text>
          <View style={styles.sourceRow}>
            <Icon name={ev.prefix === 'maleta' ? 'kit-medical' : 'tag'} size={11} color={colors.textMid} />
            <Text style={styles.source}>
              {ev.source}
              {ev.dose ? ` • ${ev.dose}` : ''}
            </Text>
          </View>
          {ev.tomado && !!ev.sintomas && (
            <View style={styles.sourceRow}>
              <Icon name="circle-exclamation" size={11} color={colors.pinkDark} />
              <Text style={styles.sintoma}>Sintoma relatado</Text>
            </View>
          )}
        </View>
        <View>{acao}</View>
      </View>
    </View>
  );
}

/** Container com a linha vertical (.timeline::before) */
export function TimelineContainer({ children }) {
  return (
    <View style={styles.timeline}>
      <View style={styles.line} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: { position: 'relative', paddingLeft: 20 },
  line: { position: 'absolute', left: 6, top: 0, bottom: 0, width: 2, backgroundColor: colors.border },
  item: { position: 'relative', marginBottom: 16, gap: 4 },
  dot: {
    position: 'absolute',
    left: -18,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    zIndex: 2,
  },
  time: { paddingLeft: 10 },
  card: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 5,
    marginLeft: 10,
    gap: 10,
    overflow: 'hidden',
  },
  // .event-card.taken (opacity .6 + grayscale) — grayscale não é suportado em todas as plataformas
  taken: { opacity: 0.6 },
  info: { flex: 1 },
  nome: { fontFamily: fonts.poppinsSemi, fontSize: 15, color: colors.textDark, marginBottom: 2 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  source: { fontFamily: fonts.inter, fontSize: 12, color: colors.textMid, flexShrink: 1 },
  sintoma: { fontFamily: fonts.interSemi, fontSize: 12, color: colors.pinkDark },
  btnTomar: { backgroundColor: colors.dark, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 12 },
  btnTomarText: { color: colors.white, fontFamily: fonts.interSemi, fontSize: 12 },
  programado: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  programadoText: { fontFamily: fonts.inter, fontSize: 11, color: '#aaa' },
});

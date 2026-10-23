// =====================================================
// DashboardScreen (#tab-dashboard)
//  Esquerda: boas-vindas, Adesão Mensal, Adesão Diária, Resumo de Saúde, promo
//  Direita: calendário semanal + agenda/timeline do dia selecionado
//  Em telas >= 900px fica em 2 colunas (1.6fr / 1fr); abaixo, 1 coluna.
// =====================================================
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import Icon from '../components/Icon';
import Calendar from '../components/Calendar';
import TimelineItem, { TimelineContainer } from '../components/TimelineItem';
import { Card, CardTitle } from '../components/Card';
import { useToast } from '../components/Toast';
import SintomasModal from '../modals/SintomasModal';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { calcularAdesaoMensal, listarMedicamentosAtivos, montarTimeline } from '../utils/doseHelpers';
import { mesNomes } from '../utils/dateHelpers';
import { colors, dailyBars, fonts, gradients, GRAD_START, GRAD_END, shadows, sizes } from '../theme';

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= sizes.breakpointWide;
  const isMobile = width <= sizes.breakpointMobile;
  const { user } = useAuth();
  const { maletaSlots, pulseiraTags, carregarDados } = useData();
  const { openModal } = useUI();
  const toast = useToast();

  const [dataAtualBase, setDataAtualBase] = useState(new Date());
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [doseRegistrando, setDoseRegistrando] = useState(null);

  // Recalcula a cada polling (3s) — mesmo efeito do atualizarDashboard()
  const { linhaTempo, totalDoses, totalTomadas } = useMemo(
    () => montarTimeline(maletaSlots, pulseiraTags, dataSelecionada),
    [maletaSlots, pulseiraTags, dataSelecionada]
  );
  const adesao = useMemo(() => calcularAdesaoMensal(maletaSlots, pulseiraTags), [maletaSlots, pulseiraTags]);
  const medsAtivos = useMemo(() => listarMedicamentosAtivos(maletaSlots, pulseiraTags), [maletaSlots, pulseiraTags]);
  const blocosAtivos = Math.round((adesao / 100) * 5);

  const firstName = (user?.nome || 'Usuário').split(' ')[0];
  const emergencia = user?.emergencia_nome
    ? `${user.emergencia_nome}${user.emergencia_telefone ? ' • ' + user.emergencia_telefone : ''}`
    : '—';

  const mudarSemana = (dir) => {
    const d = new Date(dataAtualBase);
    d.setDate(d.getDate() + dir * 7);
    setDataAtualBase(d);
  };

  /* ---------------- Coluna esquerda ---------------- */
  const left = (
    <View style={styles.left}>
      <View style={[styles.welcome, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flexShrink: 1 }}>
          <Text style={[styles.h1, { fontSize: width <= sizes.breakpointSmall ? 22 : isMobile ? 24 : 34 }]}>
            Olá, {firstName}.{'\n'}Acompanhe sua saúde!
          </Text>
          <View style={styles.badgeHealthy}>
            <Icon name="circle-check" size={13} color={colors.green} />
            <Text style={styles.badgeHealthyText}>Rotina em dia</Text>
          </View>
        </View>
        {/* "Relatório Pessoal": no HTML não tinha ação; aqui avisa que é em breve */}
        <Pressable style={styles.report} onPress={() => toast('Relatório pessoal em breve!')}>
          <LinearGradient colors={gradients.c1} start={GRAD_START} end={GRAD_END} style={styles.reportIcon}>
            <Icon name="file-medical" size={15} color={colors.white} />
          </LinearGradient>
          <Text style={styles.reportText}>Relatório{'\n'}Pessoal</Text>
          <Icon name="download" size={14} color={colors.textSoft} style={{ marginLeft: 'auto' }} />
        </Pressable>
      </View>

      <View style={[styles.charts, isMobile && { flexDirection: 'column' }]}>
        <Card style={[styles.chartCard, isMobile && { padding: 16 }]}>
          <CardTitle>Adesão Mensal Real</CardTitle>
          <Text style={styles.chartValue}>
            {adesao}
            <Text style={styles.chartUnit}>%</Text>
          </Text>
          <Text style={styles.chartHint}>No mês atual</Text>
          <View style={styles.visualLine}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.lineBlock,
                  { height: `${40 + i * 15}%` },
                  i < blocosAtivos ? { backgroundColor: colors.green, opacity: 1 } : { backgroundColor: colors.textSoft, opacity: 0.2 },
                ]}
              />
            ))}
          </View>
        </Card>

        <Card style={[styles.chartCard, isMobile && { padding: 16 }]}>
          <CardTitle>Adesão Diária</CardTitle>
          <Text style={styles.chartValue}>
            {totalTomadas}
            <Text style={styles.chartUnit}> / {totalDoses} tomadas</Text>
          </Text>
          <Text style={styles.chartHint}>Doses na data selecionada</Text>
          <View style={styles.visualBars}>
            {dailyBars.map((b, i) => (
              <View key={i} style={[styles.bar, { height: `${b.h * 100}%`, backgroundColor: b.color }]} />
            ))}
          </View>
        </Card>
      </View>

      <Card style={styles.healthCard}>
        <CardTitle icon="notes-medical">Resumo de Saúde</CardTitle>
        <View style={styles.healthGrid}>
          {[
            ['droplet', 'Tipo sanguíneo', user?.tipo_sanguineo || '—'],
            ['triangle-exclamation', 'Alergias', user?.alergias || 'Nenhuma informada'],
            ['phone', 'Contato de emergência', emergencia],
            ['pills', 'Medicamentos ativos', medsAtivos.length ? medsAtivos.join(', ') : 'Nenhum'],
          ].map(([icon, label, value]) => (
            <View key={label} style={[styles.healthItem, { minWidth: width <= sizes.breakpointSmall ? '100%' : '45%' }]}>
              <View style={styles.healthLabelRow}>
                <Icon name={icon} size={10} color={colors.textSoft} />
                <Text style={styles.healthLabel}>{label}</Text>
              </View>
              <Text style={styles.healthValue}>{value}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.healthHint}>
          Edite estes dados em{' '}
          <Text style={{ color: colors.green, fontFamily: fonts.interBold }} onPress={() => openModal('perfil')}>
            Perfil
          </Text>
          .
        </Text>
      </Card>

      <LinearGradient colors={gradients.c1} start={GRAD_START} end={GRAD_END} style={[styles.promo, isMobile && { padding: 20, minHeight: 0 }]}>
        <Text style={[styles.promoTitle, { maxWidth: isMobile ? '100%' : '60%', fontSize: isMobile ? 18 : 22 }]}>
          Como melhorar sua adesão aos medicamentos?
        </Text>
        <Text style={styles.promoText}>Mantenha sua Maleta e suas Tags sempre próximas à sua rotina matinal.</Text>
        {/* ::after com fa-heartbeat gigante e rotacionado */}
        <View style={styles.promoIcon} pointerEvents="none">
          <Icon name="heart-pulse" size={110} color="rgba(255,255,255,0.15)" />
        </View>
      </LinearGradient>
    </View>
  );

  /* ---------------- Coluna direita ---------------- */
  const right = (
    <View style={styles.right}>
      <View style={[styles.calendarCard, isMobile && { padding: 16 }]}>
        <Calendar
          dataAtualBase={dataAtualBase}
          dataSelecionada={dataSelecionada}
          onSelect={setDataSelecionada}
          onChangeWeek={mudarSemana}
        />
        <View style={styles.hr} />
        <View style={styles.agendaHeader}>
          <Text style={styles.agendaTitle}>Medicamentos Programados</Text>
          <Text style={styles.agendaDate}>{`${dataSelecionada.getDate()} de ${mesNomes[dataSelecionada.getMonth()]}`}</Text>
        </View>

        {linhaTempo.length === 0 ? (
          <Text style={styles.empty}>Sua agenda está livre nesta data!</Text>
        ) : (
          <TimelineContainer>
            {linhaTempo.map((ev, i) => (
              <TimelineItem key={ev.key} ev={ev} index={i} dataSelecionada={dataSelecionada} onRegistrar={setDoseRegistrando} />
            ))}
          </TimelineContainer>
        )}
      </View>
    </View>
  );

  return (
    <Screen onRefresh={carregarDados}>
      <View style={[styles.layout, isWide && { flexDirection: 'row', alignItems: 'flex-start' }]}>
        <View style={isWide ? { flex: 1.6 } : null}>{left}</View>
        <View style={isWide ? { flex: 1 } : null}>{right}</View>
      </View>

      <SintomasModal
        visible={!!doseRegistrando}
        onClose={() => setDoseRegistrando(null)}
        dose={doseRegistrando}
        dataSelecionada={dataSelecionada}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 24 },
  left: { gap: 20 },
  right: { gap: 24 },
  welcome: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 15 },
  h1: { fontFamily: fonts.poppinsBold, color: colors.textDark },
  badgeHealthy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(4,191,138,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 10,
  },
  badgeHealthyText: { color: colors.green, fontFamily: fonts.interBold, fontSize: 13 },
  report: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    ...shadows.sm,
  },
  reportIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reportText: { fontFamily: fonts.interBold, fontSize: 14, lineHeight: 17, color: colors.textDark },
  charts: { flexDirection: 'row', gap: 20 },
  chartCard: { flex: 1 },
  chartValue: { fontFamily: fonts.poppinsBold, fontSize: 30, color: colors.textDark },
  chartUnit: { fontFamily: fonts.poppinsMedium, fontSize: 15, color: colors.textSoft },
  chartHint: { fontFamily: fonts.inter, fontSize: 12, color: colors.textSoft },
  visualLine: { height: 60, marginTop: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  lineBlock: { flex: 1, borderRadius: 4 },
  visualBars: { height: 60, marginTop: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 },
  bar: { flex: 1, borderRadius: 4 },
  healthCard: { borderLeftWidth: 5, borderLeftColor: colors.pinkDark },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  healthItem: { flex: 1, backgroundColor: colors.bg, borderRadius: sizes.radiusSm, paddingVertical: 12, paddingHorizontal: 14, gap: 3 },
  healthLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthLabel: { fontFamily: fonts.interSemi, fontSize: 11, color: colors.textSoft },
  healthValue: { fontFamily: fonts.interBold, fontSize: 15, color: colors.textDark },
  healthHint: { fontFamily: fonts.inter, fontSize: 11, color: colors.textSoft, marginTop: 12 },
  promo: { borderRadius: sizes.radiusLg, padding: 30, minHeight: 180, overflow: 'hidden', ...shadows.pink },
  promoTitle: { fontFamily: fonts.poppinsSemi, color: colors.white, lineHeight: 28, marginBottom: 10, zIndex: 2 },
  promoText: { fontFamily: fonts.inter, fontSize: 14, color: 'rgba(255,255,255,0.9)', zIndex: 2 },
  promoIcon: { position: 'absolute', right: -10, bottom: -20, transform: [{ rotate: '-15deg' }] },
  calendarCard: { backgroundColor: colors.white, borderRadius: sizes.radiusLg, padding: 24, ...shadows.sm },
  hr: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
  agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 10 },
  agendaTitle: { fontFamily: fonts.poppinsBold, fontSize: 16, color: colors.textDark, flexShrink: 1 },
  agendaDate: { fontFamily: fonts.interBold, fontSize: 11, color: colors.textSoft, textTransform: 'uppercase' },
  empty: { textAlign: 'center', color: colors.textSoft, fontFamily: fonts.inter, fontSize: 13, paddingVertical: 20 },
});

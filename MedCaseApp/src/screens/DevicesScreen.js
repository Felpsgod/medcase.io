// =====================================================
// DevicesScreen (#view-produtos) — escolha entre Maleta e Tags.
// No HTML as "views internas" eram divs exibidas/ocultadas; aqui são
// telas de um Stack (DevicesHome -> Maleta / Tags).
// =====================================================
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import Icon from '../components/Icon';
import { PageHeading, PageSub } from '../components/Card';
import { useData } from '../contexts/DataContext';
import { colors, fonts, gradients, GRAD_START, GRAD_END, shadows, sizes } from '../theme';

function DeviceCard({ icon, gradient, title, desc, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardHover]}
    >
      <View style={styles.status}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Conectado</Text>
      </View>
      <LinearGradient colors={gradient} start={GRAD_START} end={GRAD_END} style={styles.iconWrap}>
        <Icon name={icon} size={22} color={colors.white} />
      </LinearGradient>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{desc}</Text>
    </Pressable>
  );
}

export default function DevicesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { carregarDados } = useData();
  const isMobile = width <= sizes.breakpointMobile;

  return (
    <Screen onRefresh={carregarDados}>
      <PageHeading>Meus Dispositivos</PageHeading>
      <PageSub>Selecione um equipamento para gerenciar as posologias.</PageSub>
      <View style={[styles.grid, isMobile && { flexDirection: 'column' }]}>
        <DeviceCard
          icon="kit-medical"
          gradient={gradients.c2}
          title="Maleta Inteligente"
          desc="Compartimentos configuráveis sincronizados em tempo real."
          onPress={() => navigation.navigate('Maleta')}
        />
        <DeviceCard
          icon="tag"
          gradient={gradients.c1}
          title="Tags de Frasco"
          desc="Tags inteligentes ilimitadas para acoplar em frascos individuais."
          onPress={() => navigation.navigate('Tags')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 40 },
  card: {
    flex: 1,
    minWidth: 260,
    backgroundColor: colors.white,
    borderRadius: sizes.radiusLg,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  cardHover: { transform: [{ translateY: -4 }], borderColor: colors.peachAlt2, ...shadows.md },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 18,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(4,191,138,0.1)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  statusText: { fontFamily: fonts.interBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: colors.green },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontFamily: fonts.poppinsBold, fontSize: 18, color: colors.textDark, marginBottom: 8 },
  desc: { fontFamily: fonts.inter, fontSize: 14, color: colors.textMid, lineHeight: 22 },
});

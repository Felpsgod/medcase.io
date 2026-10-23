// =====================================================
// Sidebar (aside.sidebar) — conteúdo customizado do Drawer
//  - Celular: drawer que desliza por cima (overlay escuro)
//  - Tablet+: permanente e colapsável (260px <-> 90px)
// =====================================================
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { colors, fonts, shadows, sizes } from '../theme';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';

// Mesma ordem/ícones do .nav-menu do HTML
export const MENU_ITEMS = [
  { route: 'Dashboard', label: 'Dashboard', icon: 'chart-pie' },
  { route: 'Dispositivos', label: 'Dispositivos', icon: 'briefcase-medical' },
  { route: 'Contatos', label: 'Acompanhamento', icon: 'user-doctor' },
  { route: 'Farmaceuticos', label: 'Farmacêuticos', icon: 'mortar-pestle' },
  { route: 'Alertas', label: 'Alertas', icon: 'bell' },
  { route: 'Configuracoes', label: 'Configurações', icon: 'gear' },
  { route: 'Integracao', label: 'Integração ESP32', icon: 'microchip' },
];

// abrirAba(): em "Dispositivos" volta sempre para a lista (voltarParaProdutos)
export function navegarPara(navigation, route) {
  if (route === 'Dispositivos') navigation.navigate('Dispositivos', { screen: 'DevicesHome' });
  else navigation.navigate(route);
}

export function confirmarLogout(logout) {
  Alert.alert('Sair', 'Deseja sair da conta?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sair', style: 'destructive', onPress: logout },
  ]);
}

export default function Sidebar({ state, navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { sidebarCollapsed, toggleCollapsed } = useUI();
  const { logout } = useAuth();
  const isMobile = width <= sizes.breakpointMobile;
  const collapsed = !isMobile && sidebarCollapsed;
  const activeRoute = state.routes[state.index]?.name;

  const toggle = () => (isMobile ? navigation.closeDrawer() : toggleCollapsed());

  return (
    <View style={[styles.sidebar, { paddingTop: 30 + insets.top, paddingBottom: 30 + insets.bottom }]}>
      <View style={styles.header}>
        <Pressable style={styles.toggleBtn} onPress={toggle}>
          <Icon name="bars" size={18} color={colors.dark} />
        </Pressable>
        {!collapsed && <Text style={styles.logo}>MedCase</Text>}
      </View>

      <View style={styles.nav}>
        {MENU_ITEMS.map((item) => {
          const active = activeRoute === item.route;
          return (
            <Pressable
              key={item.route}
              onPress={() => navegarPara(navigation, item.route)}
              style={({ pressed }) => [styles.item, pressed && styles.itemHover, collapsed && styles.itemCollapsed]}
            >
              {active && <View style={styles.activeBar} />}
              <Icon name={item.icon} size={18} color={active ? colors.white : '#888'} style={{ width: 24, textAlign: 'center' }} />
              {!collapsed && (
                <Text style={[styles.itemText, active && { color: colors.white }]} numberOfLines={1}>
                  {item.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable style={[styles.footer, collapsed && styles.itemCollapsed]} onPress={() => confirmarLogout(logout)}>
        <Icon name="arrow-right-from-bracket" size={18} color="#888" style={{ width: 24, textAlign: 'center' }} />
        {!collapsed && <Text style={styles.footerText}>Sair da Conta</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    backgroundColor: colors.dark,
    paddingHorizontal: 20,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 50 },
  toggleBtn: {
    width: 46,
    height: 46,
    backgroundColor: colors.white,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  logo: { fontFamily: fonts.poppinsExtra, fontSize: 22, color: colors.white, marginLeft: 15 },
  nav: { gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 15, height: 52, borderRadius: 16, paddingHorizontal: 14 },
  itemCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  itemHover: { backgroundColor: 'rgba(255,255,255,0.05)' },
  activeBar: {
    position: 'absolute',
    left: -20,
    top: 10,
    bottom: 10,
    width: 4,
    backgroundColor: colors.white,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  itemText: { fontFamily: fonts.interMedium, fontSize: 15, color: '#888' },
  footer: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 14, height: 50 },
  footerText: { fontFamily: fonts.interMedium, fontSize: 15, color: '#888' },
});

// =====================================================
// Topbar (.topbar) — usado como header de todas as telas do Drawer
//  - Mobile: botão de menu + sino + avatar
//  - Tablet+: "MedCase | Dashboard Dispositivos" + sino + avatar com nome
// =====================================================
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import Avatar from './Avatar';
import Dropdown, { DropdownDivider, DropdownItem } from './Dropdown';
import NotifItem, { ordenarNotificacoes } from './NotifItem';
import { confirmarLogout, navegarPara } from './Sidebar';
import { colors, fonts, shadows, sizes } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';

export default function Topbar({ navigation, route }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width <= sizes.breakpointMobile;
  const { user, logout } = useAuth();
  const { notificacoesList } = useData();
  const { openModal } = useUI();
  const [aberto, setAberto] = useState(null); // 'notif' | 'perfil' | null

  const notifs = ordenarNotificacoes(notificacoesList);
  const firstName = (user?.nome || 'Usuário').split(' ')[0];
  const fechar = () => setAberto(null);
  const topDropdown = insets.top + 70;

  const acao = (fn) => () => {
    fechar();
    fn();
  };

  return (
    <View style={[styles.topbar, { paddingTop: insets.top + 10, paddingHorizontal: isMobile ? 12 : 40 }]}>
      {isMobile && (
        <Pressable style={styles.menuBtn} onPress={() => navigation.toggleDrawer()} hitSlop={10}>
          <Icon name="bars" size={22} color={colors.dark} />
        </Pressable>
      )}

      {!isMobile && (
        <View style={styles.nav}>
          <Text style={styles.brand}>MedCase</Text>
          <View style={styles.divider} />
          <Pressable onPress={() => navigation.navigate('Dashboard')}>
            <Text style={[styles.navLink, route?.name === 'Dashboard' && styles.navLinkActive]}>Dashboard</Text>
          </Pressable>
          <Pressable onPress={() => navegarPara(navigation, 'Dispositivos')}>
            <Text style={[styles.navLink, route?.name === 'Dispositivos' && styles.navLinkActive]}>Dispositivos</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.user}>
        <Pressable style={styles.bell} onPress={() => setAberto('notif')} hitSlop={8}>
          <Icon name="bell" size={21} color={colors.textMid} />
          {notifs.length > 0 && <View style={styles.dot} />}
        </Pressable>

        <Pressable style={[styles.profile, isMobile && { paddingRight: 6 }]} onPress={() => setAberto('perfil')}>
          <Avatar nome={user?.nome} foto={user?.foto} size={34} />
          {!isMobile && (
            <View style={styles.nameRow}>
              <Text style={styles.name}>{firstName}</Text>
              <Icon name="chevron-down" size={10} color={colors.textSoft} />
            </View>
          )}
        </Pressable>
      </View>

      {/* Dropdown de notificações (últimas 5) */}
      <Dropdown visible={aberto === 'notif'} onClose={fechar} top={topDropdown}>
        {notifs.length === 0 ? (
          <Text style={styles.empty}>Nenhuma notificação</Text>
        ) : (
          notifs.slice(0, 5).map((n) => <NotifItem key={n.id} notif={n} onPress={acao(() => navigation.navigate('Alertas'))} />)
        )}
      </Dropdown>

      {/* Dropdown do perfil */}
      <Dropdown visible={aberto === 'perfil'} onClose={fechar} top={topDropdown}>
        <DropdownItem icon="user" label="Meu Perfil" onPress={acao(() => navigation.navigate('Perfil'))} />
        <DropdownItem icon="user-pen" label="Editar Perfil" onPress={acao(() => openModal('perfil'))} />
        <DropdownItem icon="sliders" label="Preferências" onPress={acao(() => openModal('pref'))} />
        <DropdownItem
          icon="key"
          label="Alterar Senha"
          onPress={acao(() => Alert.alert('Alterar Senha', 'Código de recuperação enviado para seu e-mail.'))}
        />
        <DropdownDivider />
        <DropdownItem icon="right-from-bracket" label="Sair da Conta" danger onPress={acao(() => confirmarLogout(logout))} />
      </Dropdown>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    backgroundColor: colors.bg,
  },
  menuBtn: { padding: 5 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  brand: { fontFamily: fonts.poppinsExtra, fontSize: 17, color: colors.textDark },
  divider: { width: 1, height: 16, backgroundColor: '#ccc' },
  navLink: { fontFamily: fonts.interSemi, fontSize: 14, color: colors.textSoft },
  navLinkActive: { color: colors.textDark },
  user: { flexDirection: 'row', alignItems: 'center', gap: 20, marginLeft: 'auto' },
  bell: { padding: 5 },
  dot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.pinkDark,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 16,
    borderRadius: 30,
    ...shadows.sm,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.interSemi, fontSize: 14, color: colors.textDark },
  empty: { padding: 10, textAlign: 'center', color: colors.textSoft, fontFamily: fonts.inter, fontSize: 13 },
});

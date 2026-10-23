// =====================================================
// Navegação
//  Root Stack: Auth (Login/Register)  |  Main (Drawer)
//  Drawer: Dashboard, Dispositivos (Stack), Contatos, Farmacêuticos,
//          Alertas, Configurações, Integração ESP32, Perfil
//  - Celular (<=768): drawer "front" que desliza + overlay escuro
//  - Tablet+: drawer permanente, colapsável (260px <-> 90px)
// =====================================================
import React from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { colors, sizes } from '../theme';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DevicesScreen from '../screens/DevicesScreen';
import MaletaScreen from '../screens/MaletaScreen';
import TagsScreen from '../screens/TagsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ESP32Screen from '../screens/ESP32Screen';
import FarmaScreen from '../screens/FarmaScreen';
import ProfileScreen from '../screens/ProfileScreen';

const RootStack = createNativeStackNavigator();
const DevicesStack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

/** Dispositivos: produtos -> Maleta / Tags (as "views internas" do HTML) */
function DevicesNavigator() {
  return (
    <DevicesStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <DevicesStack.Screen name="DevicesHome" component={DevicesScreen} />
      <DevicesStack.Screen name="Maleta" component={MaletaScreen} />
      <DevicesStack.Screen name="Tags" component={TagsScreen} />
    </DevicesStack.Navigator>
  );
}

function MainDrawer() {
  const { width } = useWindowDimensions();
  const { sidebarCollapsed } = useUI();
  const isMobile = width <= sizes.breakpointMobile;
  const drawerWidth = isMobile ? Math.min(width * 0.78, 280) : sidebarCollapsed ? sizes.sidebarWCol : sizes.sidebarW;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={{
        header: (props) => <Topbar {...props} />,
        drawerType: isMobile ? 'front' : 'permanent',
        drawerStyle: { width: drawerWidth, backgroundColor: 'transparent' },
        overlayColor: 'rgba(0,0,0,0.6)',
        sceneStyle: { backgroundColor: colors.bg },
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Dispositivos" component={DevicesNavigator} />
      <Drawer.Screen name="Contatos" component={ContactsScreen} />
      <Drawer.Screen name="Farmaceuticos" component={FarmaScreen} />
      <Drawer.Screen name="Alertas" component={NotificationsScreen} />
      <Drawer.Screen name="Configuracoes" component={SettingsScreen} />
      <Drawer.Screen name="Integracao" component={ESP32Screen} />
      <Drawer.Screen name="Perfil" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuth, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isAuth ? (
        <RootStack.Screen name="Main" component={MainDrawer} />
      ) : (
        <>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </RootStack.Navigator>
  );
}

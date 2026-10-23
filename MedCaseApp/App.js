// =====================================================
// MedCaseApp — ponto de entrada
// Migração de login.html + painel.html para React Native / Expo.
// =====================================================
import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';

import AppNavigator from './src/navigation/AppNavigator';
import GlobalModals from './src/modals/GlobalModals';
import { AuthProvider } from './src/contexts/AuthContext';
import { DataProvider } from './src/contexts/DataContext';
import { UIProvider } from './src/contexts/UIContext';
import { ToastProvider } from './src/components/Toast';
import { initOneSignal } from './src/services/notifications';
import { prepararNotificacoes } from './src/services/localNotifications';
import { colors, fontAssets } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.green, card: colors.white, text: colors.textDark },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // OneSignal.init() do <head> do painel.html (push remoto; inativo no Expo Go)
  // + canais de notificação local do Android (lembretes de dose)
  useEffect(() => {
    initOneSignal();
    prepararNotificacoes().catch(() => {});
  }, []);

  const onLayout = useCallback(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
          <StatusBar style="dark" />
          <AuthProvider>
            <DataProvider>
              <UIProvider>
                <ToastProvider>
                  <NavigationContainer theme={navTheme}>
                    <AppNavigator />
                    <GlobalModals />
                  </NavigationContainer>
                </ToastProvider>
              </UIProvider>
            </DataProvider>
          </AuthProvider>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// =====================================================
// Toast animado (.toast + mostrarToast) — fica 3s na tela.
// Uso: const toast = useToast(); toast('Salvo com sucesso!')
// =====================================================
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { colors, fonts, shadows, sizes } from '../theme';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width <= sizes.breakpointMobile;

  const mostrarToast = useCallback(
    (texto) => {
      if (timer.current) clearTimeout(timer.current);
      setMsg(texto);
      setVisible(true);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setVisible(false));
      }, 3000);
    },
    [anim]
  );

  return (
    <ToastContext.Provider value={mostrarToast}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            isMobile ? { left: 16, right: 16 } : { right: 26 },
            { bottom: 26 + insets.bottom },
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
            },
          ]}
        >
          <Icon name="circle-check" size={18} color={colors.lime} />
          <Text style={styles.text}>{msg}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    backgroundColor: colors.dark,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 3000,
    ...shadows.lg,
  },
  text: { color: colors.white, fontFamily: fonts.interSemi, fontSize: 14, flexShrink: 1 },
});

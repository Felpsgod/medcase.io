// =====================================================
// Container das páginas (.main + .page com animação fadeUp)
// Padding: 20/40 no tablet, 12 no celular; respeita a safe area inferior.
// Pull-to-refresh chama carregarDados() (extra: no HTML só havia o polling).
// =====================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { colors, sizes } from '../theme';

export default function Screen({ children, onRefresh, contentStyle, scrollRef }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width <= sizes.breakpointMobile;
  const [refreshing, setRefreshing] = useState(false);
  const focused = useIsFocused();
  const anim = useRef(new Animated.Value(0)).current;

  // @keyframes fadeUp ao entrar na aba
  useEffect(() => {
    if (focused) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [focused, anim]);

  const refresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        { paddingHorizontal: isMobile ? 12 : 40, paddingTop: 10, paddingBottom: 30 + insets.bottom },
        contentStyle,
      ]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} colors={[colors.green]} /> : undefined}
    >
      <Animated.View
        style={{
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }],
        }}
      >
        {children}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
});

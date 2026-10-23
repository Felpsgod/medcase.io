// =====================================================
// Modal genérico (.modal-overlay + .modal-box)
//  - Celular (<=768): "bottom sheet" colado embaixo, com safe area
//  - Tablet+: caixa centralizada (max-width 480)
// Fundo com blur (backdrop-filter: blur(4px)) via expo-blur.
// =====================================================
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { colors, fonts, shadows, sizes } from '../theme';

export default function AppModal({
  visible,
  onClose,
  icon = 'pills',
  iconColor = colors.green,
  iconBg = 'rgba(4,191,138,0.1)',
  title,
  subtitle,
  maxWidth = 480,
  children,
  footer,
  header,
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width <= sizes.breakpointMobile;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={isMobile ? 'slide' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Fundo: clicar fora fecha (igual ao listener e.target === modal) */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.dim]} />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.wrap, isMobile ? styles.wrapMobile : styles.wrapCenter]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.box,
              isMobile
                ? [styles.boxMobile, { maxHeight: height * 0.92, paddingBottom: 24 + insets.bottom }]
                : { width: '90%', maxWidth, maxHeight: height * 0.9 },
            ]}
          >
            {isMobile && <View style={styles.grabber} />}
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {header !== undefined ? (
                header
              ) : (
                <View style={styles.heading}>
                  <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                    <Icon name={icon} size={18} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{title}</Text>
                    {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                  </View>
                </View>
              )}
              {children}
              {footer && <View style={styles.footer}>{footer}</View>}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(24,24,24,0.6)' },
  wrap: { flex: 1 },
  wrapMobile: { justifyContent: 'flex-end' },
  wrapCenter: { justifyContent: 'center', alignItems: 'center' },
  box: { backgroundColor: colors.white, borderRadius: sizes.radiusLg, padding: 34, ...shadows.lg },
  boxMobile: { width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 24 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', marginTop: -10, marginBottom: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 26 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.poppinsExtra, fontSize: 17, color: colors.textDark },
  subtitle: { fontFamily: fonts.inter, fontSize: 13, color: colors.textSoft, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 26,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
  },
});

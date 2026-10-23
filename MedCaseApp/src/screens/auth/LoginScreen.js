// =====================================================
// LoginScreen (#card-login do login.html)
// "Esqueci minha senha": o HTML usava prompt(); no RN o Alert.prompt só
// existe no iOS, então usamos um modal com campo de e-mail.
// =====================================================
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthInput from './AuthInput';
import s from './authStyles';
import Icon from '../../components/Icon';
import AppModal from '../../components/Modal';
import { Button, Field, Input } from '../../components/Form';
import { useAuth } from '../../contexts/AuthContext';
import { handleForgot } from '../../services/auth';
import { colors } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, senha); // AuthContext troca para o painel automaticamente
    } catch (e) {
      Alert.alert('MedCase', e.message);
    } finally {
      setLoading(false);
    }
  };

  const enviarRecuperacao = async () => {
    setForgotLoading(true);
    try {
      const msg = await handleForgot(forgotEmail);
      setForgotOpen(false);
      Alert.alert('Recuperação de senha', msg);
    } catch (e) {
      Alert.alert('Recuperação de senha', e.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <View style={s.bg}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: 20 + insets.top, paddingBottom: 20 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.card}>
            <Text style={s.title}>
              MedCase <Text style={{ color: colors.pinkDark }}>●</Text>
            </Text>
            <Text style={s.subtitle}>Seu assistente pessoal de saúde.</Text>

            <AuthInput
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <AuthInput
              label="Senha"
              value={senha}
              onChangeText={setSenha}
              placeholder="••••••••"
              secureTextEntry
              onSubmitEditing={handleLogin}
            />

            <Pressable style={({ pressed }) => [s.btn, pressed && { backgroundColor: '#000' }]} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={s.btnText}>Acessar Painel</Text>
                  <Icon name="arrow-right" size={15} color={colors.white} />
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setForgotEmail(email);
                setForgotOpen(true);
              }}
            >
              <Text style={s.forgot}>Esqueci minha senha</Text>
            </Pressable>

            <View style={s.divider} />
            <Text style={s.switchText}>
              Não tem uma conta?{' '}
              <Text style={s.switchLink} onPress={() => navigation.navigate('Register')}>
                Criar agora
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppModal
        visible={forgotOpen}
        onClose={() => setForgotOpen(false)}
        icon="key"
        title="Recuperar senha"
        subtitle="Enviaremos uma nova senha pelo WhatsApp"
        maxWidth={400}
        footer={
          <>
            <Button title="Cancelar" variant="ghost" onPress={() => setForgotOpen(false)} />
            <Button title={forgotLoading ? 'Enviando...' : 'Enviar'} icon="paper-plane" onPress={enviarRecuperacao} disabled={forgotLoading} />
          </>
        }
      >
        <Field label="E-mail da sua conta">
          <Input
            value={forgotEmail}
            onChangeText={setForgotEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Field>
      </AppModal>
    </View>
  );
}

// =====================================================
// RegisterScreen (#card-register do login.html)
// =====================================================
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthInput from './AuthInput';
import s from './authStyles';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      await register({ nome, email, telefone, senha });
      Alert.alert('MedCase', 'Conta criada com sucesso!');
    } catch (e) {
      Alert.alert('MedCase', e.message);
    } finally {
      setLoading(false);
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
            <Text style={s.title}>Criar Conta</Text>
            <Text style={[s.subtitle, { marginBottom: 24 }]}>Configure seu acesso pessoal.</Text>

            <AuthInput label="Seu Nome" value={nome} onChangeText={setNome} placeholder="Ex: Maikol" />
            <AuthInput
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuthInput
              label="WhatsApp (com DDD)"
              value={telefone}
              onChangeText={setTelefone}
              placeholder="(11) 99999-9999"
              keyboardType="phone-pad"
            />
            <AuthInput label="Senha" value={senha} onChangeText={setSenha} placeholder="Crie uma senha forte" secureTextEntry />

            <Pressable style={({ pressed }) => [s.btn, pressed && { backgroundColor: '#000' }]} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnText}>Concluir Cadastro</Text>}
            </Pressable>

            <View style={s.divider} />
            <Text style={s.switchText}>
              Já possui conta?{' '}
              <Text style={s.switchLink} onPress={() => navigation.navigate('Login')}>
                Fazer Login
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

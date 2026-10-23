// =====================================================
// SettingsScreen (#tab-configuracoes)
//  - Ativar notificações (locais: lembretes de dose; + OneSignal fora do Expo Go)
//  - Enviar notificação de teste
//  - Reiniciar Histórico (apaga historico_tomadas de todos os remédios)
// =====================================================
import React, { useCallback, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import Icon from '../components/Icon';
import { Button } from '../components/Form';
import { PageHeading } from '../components/Card';
import { useToast } from '../components/Toast';
import { useData } from '../contexts/DataContext';
import { reiniciarHistorico } from '../services/api';
import { isPushDisponivel, pedirPermissaoNotificacao } from '../services/notifications';
import {
  agendarLembretesDoses,
  contarLembretesAgendados,
  notificarAgora,
  pedirPermissao,
  temPermissao,
} from '../services/localNotifications';
import { colors, fonts, sizes } from '../theme';

export default function SettingsScreen() {
  const { maletaSlots, pulseiraTags, carregarDados, notificar } = useData();
  const toast = useToast();
  const [permitido, setPermitido] = useState(null);
  const [lembretes, setLembretes] = useState(0);

  const atualizarEstado = useCallback(async () => {
    setPermitido(await temPermissao());
    setLembretes(await contarLembretesAgendados());
  }, []);

  useFocusEffect(
    useCallback(() => {
      atualizarEstado();
    }, [atualizarEstado])
  );

  const ativarNotificacoes = async () => {
    const ok = await pedirPermissao();
    if (!ok) {
      Alert.alert(
        'Notificações bloqueadas',
        'Libere as notificações do app nas configurações do celular para receber os lembretes de dose.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
        ]
      );
      return atualizarEstado();
    }
    const n = await agendarLembretesDoses(maletaSlots, pulseiraTags);
    // Push remoto (OneSignal) só existe em build de desenvolvimento/produção
    if (isPushDisponivel()) pedirPermissaoNotificacao().catch(() => {});
    toast(`Notificações ativadas! ${n} lembrete(s) de dose agendado(s).`);
    notificar('Sistema de Alertas', 'Notificações ativadas neste dispositivo.');
    atualizarEstado();
  };

  const enviarTeste = async () => {
    const ok = await notificarAgora('🔔 Teste do MedCase', 'Se você está vendo isto, as notificações estão funcionando!');
    if (!ok) Alert.alert('Notificações', 'Ative as notificações primeiro.');
  };

  const reiniciarSimulacao = () => {
    Alert.alert('Apagar Histórico', 'Isto vai apagar TODO o histórico de tomadas. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            // Uma chamada só: DELETE /api/tomadas (antes era um PATCH por remédio)
            await reiniciarHistorico();
            carregarDados();
            toast('Histórico reiniciado!');
          } catch (e) {
            Alert.alert('Erro', e.message);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <PageHeading>Configurações</PageHeading>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Icon name="mobile-screen" size={17} color={colors.green} />
            <Text style={styles.h3}>Notificações no Celular</Text>
          </View>
          {/* No HTML (PWA) era preciso adicionar à Tela de Início no iPhone; no app nativo não. */}
          <Text style={styles.p}>
            O MedCase avisa no horário de cada dose, mesmo com o app fechado. Toque no botão e permita as notificações
            quando o {Platform.OS === 'ios' ? 'iOS' : 'Android'} perguntar.
          </Text>
          <View style={styles.statusRow}>
            <Icon
              name={permitido ? 'circle-check' : 'circle-exclamation'}
              size={13}
              color={permitido ? colors.green : colors.orange}
            />
            <Text style={styles.statusText}>
              {permitido === null
                ? 'Verificando...'
                : permitido
                ? `Permitidas • ${lembretes} lembrete(s) de dose agendado(s)`
                : 'Ainda não permitidas'}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            <Button
              title={permitido ? 'Reagendar lembretes' : 'Ativar notificações'}
              icon="bell"
              variant="green"
              onPress={ativarNotificacoes}
              style={{ flex: 0 }}
            />
            <Button title="Enviar notificação de teste" icon="paper-plane" variant="ghost" onPress={enviarTeste} style={{ flex: 0 }} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Icon name="rotate-left" size={17} color={colors.pinkDark} />
            <Text style={styles.h3}>Reiniciar Histórico</Text>
          </View>
          <Text style={[styles.p, { marginBottom: 24 }]}>Zerar os registros de tomadas de todos os remédios da sua conta.</Text>
          <Button title="Apagar Histórico" icon="trash" variant="danger" onPress={reiniciarSimulacao} style={{ flex: 0 }} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 20, maxWidth: 500, width: '100%' },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: sizes.radiusLg, padding: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  h3: { fontFamily: fonts.poppinsSemi, fontSize: 17, color: colors.textDark },
  p: { fontFamily: fonts.inter, color: colors.textSoft, marginBottom: 20, fontSize: 14, lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  statusText: { fontFamily: fonts.interSemi, fontSize: 13, color: colors.textMid },
});

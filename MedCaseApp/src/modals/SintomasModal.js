// =====================================================
// SintomasModal (#sintomas-modal) — registrar tomada (hora real + sintomas)
// POST /api/medicamentos/<maleta|tag>/<id>/tomadas
// O servidor grava a tomada, cria a notificação, envia o push e avisa os
// contatos de acompanhamento pelo WhatsApp.
// =====================================================
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import AppModal from '../components/Modal';
import HoraAMPM from '../components/HoraAMPM';
import { Button, Field, Input, TimeWithNow } from '../components/Form';
import { useData } from '../contexts/DataContext';
import { useToast } from '../components/Toast';
import { registrarTomada } from '../services/api';
import { horaAgora, toLocalISODate } from '../utils/dateHelpers';
import { colors, fonts, sizes } from '../theme';

export default function SintomasModal({ visible, onClose, dose, dataSelecionada }) {
  const { carregarDados } = useData();
  const toast = useToast();
  const [horaReal, setHoraReal] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [salvando, setSalvando] = useState(false);

  // abrirModalSintomas: hora real = agora, sintomas vazio
  useEffect(() => {
    if (visible) {
      setHoraReal(horaAgora());
      setSintomas('');
    }
  }, [visible]);

  const salvarSintomasDose = async () => {
    if (!dose) return;
    if (!horaReal) return Alert.alert('Atenção', 'Informe que horas você tomou.');
    setSalvando(true);
    try {
      const resp = await registrarTomada(dose.prefix, dose.id, {
        data: toLocalISODate(dataSelecionada),
        hora_programada: dose.hora,
        hora_real: horaReal,
        sintomas,
      });
      // contatos_avisados: quantos contatos o servidor vai avisar pelo WhatsApp
      toast(resp?.contatos_avisados > 0 ? 'Dose salva! Seus contatos foram avisados.' : 'Dose registrada!');
      onClose();
      carregarDados();
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      icon="circle-check"
      title="Registrar Tomada"
      subtitle={dose?.nome || 'Nome do Remédio'}
      maxWidth={420}
      footer={
        <>
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
          <Button title="Confirmar Dose" icon="check" variant="green" onPress={salvarSintomasDose} disabled={salvando} />
        </>
      }
    >
      <View style={styles.box}>
        <Text style={styles.boxText}>Dose programada para as</Text>
        <HoraAMPM hora={dose?.hora} size={15} color={colors.green} style={{ justifyContent: 'center' }} />
      </View>

      <Field label="Que horas você realmente tomou?">
        <TimeWithNow value={horaReal} onChange={setHoraReal} />
      </Field>

      <Field label="Sentiu algum sintoma ou desconforto? (Opcional)" labelStyle={{ color: colors.pinkDark }}>
        <Input
          value={sintomas}
          onChangeText={setSintomas}
          multiline
          numberOfLines={3}
          placeholder="Ex: Desconforto gástrico, leve tontura... Deixe em branco se estiver tudo bem."
        />
      </Field>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.bg, borderRadius: sizes.radiusSm, padding: 16, marginBottom: 20, alignItems: 'center', gap: 6 },
  boxText: { fontFamily: fonts.interSemi, fontSize: 14, color: colors.textDark },
});

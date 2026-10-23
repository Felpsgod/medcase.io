// =====================================================
// FarmaModal (#modal-farma) — solicitar consulta
// POST /api/farmaceuticos/<id>/agendamentos (fica registrado no servidor)
// =====================================================
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AppModal from '../components/Modal';
import { Button, DateField, Field, Input, SelectField } from '../components/Form';
import { useToast } from '../components/Toast';
import { useData } from '../contexts/DataContext';
import { agendarFarmaceutico } from '../services/api';

export default function FarmaModal({ visible, onClose, farma }) {
  const toast = useToast();
  const { carregarDados } = useData();
  const [data, setData] = useState('');
  const [periodo, setPeriodo] = useState('Manhã');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (visible) {
      setData('');
      setPeriodo('Manhã');
      setMotivo('');
    }
  }, [visible]);

  const confirmarAgendamentoFarma = async () => {
    if (!farma) return;
    setEnviando(true);
    try {
      await agendarFarmaceutico(farma.id, { data, periodo, motivo });
      onClose();
      toast('Solicitação enviada! O farmacêutico entrará em contato.');
      carregarDados();
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      icon="calendar-check"
      title="Agendar consulta"
      subtitle={farma?.nome || 'Farmacêutico'}
      maxWidth={420}
      footer={
        <>
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
          <Button title={enviando ? 'Enviando...' : 'Solicitar'} icon="paper-plane" onPress={confirmarAgendamentoFarma} disabled={enviando} />
        </>
      }
    >
      <Field label="Data preferida">
        <DateField value={data} onChange={setData} placeholder="Selecione" />
      </Field>
      <Field label="Período">
        <SelectField value={periodo} options={['Manhã', 'Tarde', 'Noite']} onChange={setPeriodo} />
      </Field>
      <Field label="Sobre o que deseja falar?">
        <Input
          value={motivo}
          onChangeText={setMotivo}
          multiline
          numberOfLines={3}
          placeholder="Ex: dúvidas de interação entre meus remédios"
        />
      </Field>
    </AppModal>
  );
}

// =====================================================
// PreferenciasModal (#modal-pref) — Notificações Push / Som de Alerta
// Salvas no servidor (PUT /api/perfil/preferencias). O backend respeita
// "Notificações Push" desligado e não envia push para este usuário.
// =====================================================
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AppModal from '../components/Modal';
import { Button, CheckRow } from '../components/Form';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { salvarPreferencias } from '../services/api';

export default function PreferenciasModal({ visible, onClose }) {
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const [push, setPush] = useState(true);
  const [som, setSom] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPush(user?.preferencias?.push !== false);
    setSom(user?.preferencias?.som !== false);
  }, [visible, user]);

  const concluir = async () => {
    setSalvando(true);
    try {
      const atualizado = await salvarPreferencias({ push, som });
      await updateUser(atualizado);
      onClose();
      toast('Preferências salvas!');
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
      icon="sliders"
      title="Preferências"
      subtitle="Ajustes do aplicativo"
      maxWidth={400}
      footer={<Button title={salvando ? 'Salvando...' : 'Concluir'} onPress={concluir} disabled={salvando} />}
    >
      <CheckRow label="Notificações Push" value={push} onValueChange={setPush} bordered bold />
      <CheckRow label="Som de Alerta" value={som} onValueChange={setSom} bordered bold />
    </AppModal>
  );
}

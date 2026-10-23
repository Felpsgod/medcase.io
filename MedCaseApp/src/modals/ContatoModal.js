// =====================================================
// ContatoModal (#modal-contato) — criar/editar familiar ou médico
// =====================================================
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AppModal from '../components/Modal';
import { Button, Field, Input, SelectField } from '../components/Form';
import { useData } from '../contexts/DataContext';
import { useToast } from '../components/Toast';
import { salvarContato } from '../services/api';
import { colors } from '../theme';

const TIPOS = [
  { value: 'Familiar', label: 'Familiar / Cuidador' },
  { value: 'Médico', label: 'Médico(a)' },
];

export default function ContatoModal({ visible, onClose, contatoId }) {
  const { listaContatos, carregarDados } = useData();
  const toast = useToast();
  const [tipo, setTipo] = useState('Familiar');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const isEdit = !!(contatoId && listaContatos[contatoId]);

  useEffect(() => {
    if (!visible) return;
    const c = contatoId ? listaContatos[contatoId] : null;
    setTipo(c?.tipo || 'Familiar');
    setNome(c?.nome || '');
    setTelefone(c?.telefone || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, contatoId]);

  const salvar = async () => {
    if (!nome.trim() || !telefone.trim()) return Alert.alert('Atenção', 'Preencha nome e telefone.');
    const contato = { tipo, nome: nome.trim(), telefone: telefone.trim() };
    try {
      // POST /api/contatos (novo) ou PUT /api/contatos/<id> (edição)
      await salvarContato(isEdit ? contatoId : null, contato);
    } catch (e) {
      return Alert.alert('Erro', e.message);
    }
    onClose();
    toast(isEdit ? 'Contato atualizado!' : 'Contato cadastrado!');
    carregarDados();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      icon="user-doctor"
      iconColor={colors.orange}
      iconBg="rgba(242,190,126,0.2)"
      title={isEdit ? 'Editar Contato' : 'Novo Contato'}
      subtitle="Quem será avisado?"
      footer={
        <>
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
          <Button title="Salvar" icon="floppy-disk" onPress={salvar} />
        </>
      }
    >
      <Field label="Tipo de Contato">
        <SelectField value={tipo} options={TIPOS} onChange={setTipo} />
      </Field>
      <Field label="Nome">
        <Input value={nome} onChangeText={setNome} placeholder="Ex: Dra. Ana" />
      </Field>
      <Field label="WhatsApp / Celular">
        <Input value={telefone} onChangeText={setTelefone} placeholder="(11) 99999-9999" keyboardType="phone-pad" />
      </Field>
    </AppModal>
  );
}

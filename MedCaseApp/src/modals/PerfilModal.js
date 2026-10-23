// =====================================================
// PerfilModal (#modal-perfil) — foto (expo-image-picker), dados pessoais
// e de saúde. PUT /api/perfil (o servidor guarda tudo, inclusive a foto,
// e registra a notificação); o retorno atualiza a sessão local.
// =====================================================
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AppModal from '../components/Modal';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { Button, Field, Input, Row2, SelectField } from '../components/Form';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../components/Toast';
import { salvarPerfil as salvarPerfilApi } from '../services/api';
import { colors } from '../theme';

const TIPOS_SANGUE = [{ value: '', label: '--' }, 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PerfilModal({ visible, onClose }) {
  const { user, updateUser } = useAuth();
  const { carregarDados } = useData();
  const toast = useToast();
  const [form, setForm] = useState({});
  const [foto, setFoto] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setForm({
      nome: user.nome || '',
      telefone: user.telefone || '',
      tipo_sanguineo: user.tipo_sanguineo || '',
      alergias: user.alergias || '',
      emergencia_nome: user.emergencia_nome || '',
      emergencia_telefone: user.emergencia_telefone || '',
    });
    setFoto(user.foto || '');
  }, [visible, user]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // previewImage(): FileReader.readAsDataURL -> ImagePicker com base64
  const escolherFoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permissão', 'Permita o acesso às fotos para escolher uma imagem de perfil.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4, // reduz o tamanho do base64 guardado no AsyncStorage
      base64: true,
    });
    if (!res.canceled && res.assets?.[0]?.base64) {
      const a = res.assets[0];
      setFoto(`data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`);
    }
  };

  const salvarPerfil = async () => {
    if (!user) return;
    setSalvando(true);
    try {
      const atualizado = await salvarPerfilApi({ ...form, foto });
      await updateUser(atualizado);
      onClose();
      toast('Perfil Atualizado com sucesso!');
      carregarDados(); // mostra a notificação "Perfil" criada pelo servidor
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
      icon="user"
      title="Editar Perfil"
      subtitle="Seus dados pessoais"
      maxWidth={420}
      footer={
        <>
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
          <Button title="Salvar Perfil" icon="floppy-disk" onPress={salvarPerfil} disabled={salvando} />
        </>
      }
    >
      <Pressable style={styles.picWrap} onPress={escolherFoto}>
        <Avatar nome={form.nome || user?.nome} foto={foto} size={90} fontSize={34} />
        <View style={styles.camBadge}>
          <Icon name="camera" size={13} color={colors.white} />
        </View>
      </Pressable>

      <Field label="Nome completo">
        <Input value={form.nome} onChangeText={set('nome')} placeholder="Seu nome" />
      </Field>
      <Field label="E-mail pessoal">
        <Input value={user?.email || ''} disabled />
      </Field>
      <Field label="Telefone pessoal">
        <Input value={form.telefone} onChangeText={set('telefone')} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
      </Field>

      <Row2>
        <Field label="Tipo Sanguíneo">
          <SelectField value={form.tipo_sanguineo} options={TIPOS_SANGUE} onChange={set('tipo_sanguineo')} />
        </Field>
        <Field label="Alergias">
          <Input value={form.alergias} onChangeText={set('alergias')} placeholder="Ex: Dipirona, Penicilina" />
        </Field>
      </Row2>

      <Row2>
        <Field label="Emergência — Nome">
          <Input value={form.emergencia_nome} onChangeText={set('emergencia_nome')} placeholder="Ex: Maria (filha)" />
        </Field>
        <Field label="Emergência — WhatsApp">
          <Input
            value={form.emergencia_telefone}
            onChangeText={set('emergencia_telefone')}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
          />
        </Field>
      </Row2>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  // Overlay de câmera do hover (.profile-pic-overlay) vira um selo fixo — não há hover no toque
  picWrap: { alignSelf: 'center', marginBottom: 24 },
  camBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});

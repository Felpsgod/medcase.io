// =====================================================
// ProfileScreen — no HTML o perfil era só o modal (#modal-perfil) e o
// dropdown do avatar. No app criamos uma tela "Meu Perfil" que resume os
// dados e reúne as ações do dropdown (editar, preferências, senha, sair).
// =====================================================
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { Button } from '../components/Form';
import { Card, CardTitle, PageHeading } from '../components/Card';
import { confirmarLogout } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { colors, fonts, sizes } from '../theme';

function Info({ icon, label, value }) {
  return (
    <View style={styles.item}>
      <View style={styles.labelRow}>
        <Icon name={icon} size={10} color={colors.textSoft} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { openModal } = useUI();

  return (
    <Screen>
      <PageHeading>Meu Perfil</PageHeading>
      <View style={styles.wrap}>
        <Card style={styles.header}>
          <Avatar nome={user?.nome} foto={user?.foto} size={90} fontSize={34} />
          <Text style={styles.name}>{user?.nome}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Button title="Editar Perfil" icon="user-pen" onPress={() => openModal('perfil')} style={{ flex: 0, alignSelf: 'stretch', marginTop: 16 }} />
        </Card>

        <Card>
          <CardTitle icon="notes-medical">Dados pessoais e de saúde</CardTitle>
          <View style={styles.grid}>
            <Info icon="phone" label="Telefone" value={user?.telefone} />
            <Info icon="droplet" label="Tipo sanguíneo" value={user?.tipo_sanguineo} />
            <Info icon="triangle-exclamation" label="Alergias" value={user?.alergias || 'Nenhuma informada'} />
            <Info
              icon="phone"
              label="Contato de emergência"
              value={user?.emergencia_nome ? `${user.emergencia_nome}${user.emergencia_telefone ? ' • ' + user.emergencia_telefone : ''}` : ''}
            />
          </View>
        </Card>

        <Card style={{ gap: 12 }}>
          <Button title="Preferências" icon="sliders" variant="ghost" onPress={() => openModal('pref')} style={{ flex: 0 }} />
          <Button
            title="Alterar Senha"
            icon="key"
            variant="ghost"
            onPress={() => Alert.alert('Alterar Senha', 'Código de recuperação enviado para seu e-mail.')}
            style={{ flex: 0 }}
          />
          <Button title="Sair da Conta" icon="right-from-bracket" variant="danger" onPress={() => confirmarLogout(logout)} style={{ flex: 0 }} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 20, maxWidth: 560, width: '100%' },
  header: { alignItems: 'center' },
  name: { fontFamily: fonts.poppinsBold, fontSize: 20, color: colors.textDark, marginTop: 14 },
  email: { fontFamily: fonts.inter, fontSize: 14, color: colors.textSoft, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  item: { flexGrow: 1, minWidth: '45%', backgroundColor: colors.bg, borderRadius: sizes.radiusSm, paddingVertical: 12, paddingHorizontal: 14, gap: 3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: fonts.interSemi, fontSize: 11, color: colors.textSoft },
  value: { fontFamily: fonts.interBold, fontSize: 15, color: colors.textDark },
});

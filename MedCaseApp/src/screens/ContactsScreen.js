// =====================================================
// ContactsScreen (#tab-contatos) — Acompanhamento (familiares e médicos)
// =====================================================
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Screen from '../components/Screen';
import ContactCard from '../components/ContactCard';
import { Button } from '../components/Form';
import { useToast } from '../components/Toast';
import ContatoModal from '../modals/ContatoModal';
import { useData } from '../contexts/DataContext';
import { removerContato } from '../services/api';
import { colors, fonts, sizes } from '../theme';

export default function ContactsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width <= sizes.breakpointMobile;
  const { listaContatos, carregarDados } = useData();
  const toast = useToast();
  const [modal, setModal] = useState({ open: false, id: null });
  const [gridW, setGridW] = useState(0);

  const keys = Object.keys(listaContatos);
  // repeat(auto-fill, minmax(300px, 1fr)); celular: 1 coluna
  const cols = isMobile ? 1 : Math.max(1, Math.floor((gridW + 20) / 320));
  const itemW = gridW ? (gridW - 20 * (cols - 1)) / cols : '100%';

  const deletarContato = (id) => {
    Alert.alert('Remover', 'Remover este acompanhamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removerContato(id); // DELETE /api/contatos/<id>
            carregarDados();
            toast('Contato removido!');
          } catch (e) {
            Alert.alert('Erro', e.message);
          }
        },
      },
    ]);
  };

  return (
    <Screen onRefresh={carregarDados}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text style={[styles.title, { fontSize: isMobile ? 22 : 28 }]}>Acompanhamento</Text>
          <Text style={styles.sub}>Adicione familiares e médicos. Eles serão notificados automaticamente.</Text>
        </View>
        <Button title="Novo Contato" icon="plus" onPress={() => setModal({ open: true, id: null })} style={{ flex: 0, paddingHorizontal: 20 }} />
      </View>

      <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
        {keys.length === 0 ? (
          <Text style={styles.empty}>Nenhum contato cadastrado. Adicione familiares ou médicos.</Text>
        ) : (
          keys.map((k) => (
            <View key={k} style={{ width: itemW }}>
              <ContactCard
                contato={listaContatos[k]}
                onEdit={() => setModal({ open: true, id: k })}
                onDelete={() => deletarContato(k)}
              />
            </View>
          ))
        )}
      </View>

      <ContatoModal visible={modal.open} contatoId={modal.id} onClose={() => setModal({ open: false, id: null })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15, marginBottom: 24 },
  title: { fontFamily: fonts.poppinsExtra, color: colors.textDark, marginBottom: 5 },
  sub: { fontFamily: fonts.inter, color: colors.textMid, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  empty: { fontFamily: fonts.inter, color: colors.textSoft, fontSize: 14 },
});

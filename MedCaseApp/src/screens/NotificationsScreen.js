// =====================================================
// NotificationsScreen (#tab-notificacoes) — Alertas de Sistema
// =====================================================
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Screen from '../components/Screen';
import NotifItem, { ordenarNotificacoes } from '../components/NotifItem';
import { Card, PageHeading } from '../components/Card';
import { useData } from '../contexts/DataContext';
import { fonts } from '../theme';

export default function NotificationsScreen() {
  const { notificacoesList, carregarDados } = useData();
  const lista = ordenarNotificacoes(notificacoesList);

  return (
    <Screen onRefresh={carregarDados}>
      <PageHeading>Alertas de Sistema</PageHeading>
      <Card style={styles.container}>
        {lista.length === 0 ? (
          <Text style={styles.empty}>Nenhum registro de sistema no momento.</Text>
        ) : (
          lista.map((n) => <NotifItem key={n.id} notif={n} />)
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 200 },
  empty: { textAlign: 'center', color: '#888', paddingVertical: 40, fontFamily: fonts.inter, fontSize: 14 },
});

// =====================================================
// ESP32Screen (#tab-integracao)
//  - Vincular dispositivo (POST /api/esp)
//  - Listar / desvincular dispositivos (GET / DELETE /api/esp)
//  - Logs do dispositivo selecionado: filtro por tipo + polling a cada 5s
// =====================================================
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import Icon from '../components/Icon';
import LogEntry from '../components/LogEntry';
import { Button, Field, Input } from '../components/Form';
import { useToast } from '../components/Toast';
import { useData } from '../contexts/DataContext';
import * as esp from '../services/esp32';
import { formatarData } from '../utils/dateHelpers';
import { colors, fonts, shadows, sizes } from '../theme';

const FILTROS = [
  ['TODOS', 'Todos'],
  ['SISTEMA', 'Sistema'],
  ['ALERTA', 'Alertas'],
  ['ERRO', 'Erros'],
  ['SUCESSO', 'Sucesso'],
  ['INFO', 'Info'],
];
const LOGS_POLLING_MS = 5000;

export default function ESP32Screen() {
  const toast = useToast();
  const { carregarDados } = useData();
  const [espId, setEspId] = useState('');
  const [status, setStatus] = useState(null); // { ok, msg }
  const [dispositivos, setDispositivos] = useState({});
  const [espSelecionado, setEspSelecionado] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filtro, setFiltro] = useState('TODOS');
  const [vinculando, setVinculando] = useState(false);

  const carregarDispositivos = useCallback(async () => {
    try {
      setDispositivos(await esp.carregarDispositivos());
    } catch (e) {
      // sem conexão: mantém a lista atual
    }
  }, []);

  // Recarrega a lista ao entrar na aba (status online/offline pode mudar)
  useFocusEffect(
    useCallback(() => {
      carregarDispositivos();
    }, [carregarDispositivos])
  );

  // setInterval(carregarLogs, 5000) — só quando há um ESP selecionado
  useEffect(() => {
    if (!espSelecionado) return undefined;
    let ativo = true;
    const carregar = async () => {
      try {
        const l = await esp.carregarLogs(espSelecionado);
        if (ativo) setLogs(l);
      } catch (e) {
        // falha pontual de rede: tenta de novo no próximo ciclo
      }
    };
    carregar();
    const t = setInterval(carregar, LOGS_POLLING_MS);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, [espSelecionado]);

  const vincularESP = async () => {
    if (!espId.trim()) return setStatus({ ok: false, msg: 'Digite o ID do dispositivo' });
    setVinculando(true);
    try {
      await esp.vincularESP(espId);
      setStatus({ ok: true, msg: 'Dispositivo vinculado! Agora ligue o ESP32.' });
      setEspId('');
      carregarDispositivos();
      carregarDados(); // atualiza notificações
    } catch (e) {
      setStatus({ ok: false, msg: `Erro ao vincular: ${e.message}` });
    } finally {
      setVinculando(false);
    }
  };

  const limparLogs = () => {
    if (!espSelecionado) return Alert.alert('Logs', 'Selecione um dispositivo primeiro');
    Alert.alert('Limpar', 'Limpar todos os logs deste dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: async () => {
          try {
            await esp.limparLogs(espSelecionado);
            setLogs([]);
            toast('Logs limpos com sucesso!');
          } catch (e) {
            Alert.alert('Erro', e.message);
          }
        },
      },
    ]);
  };

  const desvincularESP = (id) => {
    Alert.alert('Desvincular', `Desvincular dispositivo ${id}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desvincular',
        style: 'destructive',
        onPress: async () => {
          try {
            await esp.desvincularESP(id);
          } catch (e) {
            return Alert.alert('Erro', e.message);
          }
          setDispositivos((d) => {
            const c = { ...d };
            delete c[id];
            return c;
          });
          if (espSelecionado === id) {
            setEspSelecionado(null);
            setLogs([]);
          }
          toast('Dispositivo desvinculado');
        },
      },
    ]);
  };

  const ids = Object.keys(dispositivos || {});
  const logsArr = esp.prepararLogs(logs, filtro);

  return (
    <Screen onRefresh={carregarDispositivos}>
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.title}>Integração ESP32</Text>
        <Text style={styles.sub}>Vincule seu dispositivo ESP32 e monitore os logs em tempo real</Text>
      </View>

      {/* CARD DE VINCULAÇÃO */}
      <View style={styles.card}>
        <View style={styles.h3Row}>
          <Icon name="link" size={16} color={colors.green} />
          <Text style={styles.h3}>Vincular Dispositivo</Text>
        </View>
        <View style={styles.vincRow}>
          <Field label="ID do dispositivo ESP32" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <Input
              value={espId}
              onChangeText={setEspId}
              placeholder="Ex: 12345"
              autoCapitalize="none"
              style={{ fontFamily: fonts.mono, fontSize: 19, letterSpacing: 2 }}
            />
          </Field>
          <Button
            title={vinculando ? 'Vinculando...' : 'Vincular ESP32'}
            icon="plug"
            onPress={vincularESP}
            disabled={vinculando}
            style={{ flex: 0, paddingHorizontal: 30 }}
          />
        </View>
        {status && (
          <View style={[styles.status, { backgroundColor: status.ok ? 'rgba(50,205,50,0.1)' : 'rgba(255,99,71,0.1)' }]}>
            <Icon name={status.ok ? 'circle-check' : 'triangle-exclamation'} size={13} color={status.ok ? '#32CD32' : '#FF6347'} />
            <Text style={{ color: status.ok ? '#32CD32' : '#FF6347', fontFamily: fonts.interSemi, flex: 1 }}>{status.msg}</Text>
          </View>
        )}
      </View>

      {/* LISTA DE DISPOSITIVOS VINCULADOS */}
      <View style={{ marginBottom: 30 }}>
        {ids.length === 0 ? (
          <Text style={styles.empty}>Nenhum dispositivo vinculado</Text>
        ) : (
          <>
            <Text style={[styles.h3, { marginBottom: 15 }]}>Dispositivos Vinculados</Text>
            {ids.map((id) => {
              const disp = dispositivos[id] || {};
              const isOnline = disp.status === 'online';
              const dataVinc = disp.data_vinculo;
              const selecionado = espSelecionado === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    setEspSelecionado(id);
                    setLogs([]);
                  }}
                  style={[styles.devCard, selecionado && { borderColor: colors.green }]}
                >
                  <Icon name="microchip" size={30} color={isOnline ? colors.green : '#888'} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.devTitle}>ESP32 #{id}</Text>
                    <Text style={styles.devName}>{disp.nome || 'Dispositivo MedCase'}</Text>
                    <Text style={styles.devDate}>Vinculado em: {dataVinc ? formatarData(dataVinc) : 'N/A'}</Text>
                  </View>
                  <View style={styles.devStatus}>
                    <Icon name="circle" size={9} color={isOnline ? colors.green : '#888'} />
                    <Text style={{ color: isOnline ? colors.green : '#888', fontFamily: fonts.interSemi, fontSize: 13 }}>
                      {isOnline ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                  <Pressable style={styles.unlink} onPress={() => desvincularESP(id)} hitSlop={4}>
                    <Icon name="link-slash" size={13} color={colors.pinkDark} />
                  </Pressable>
                </Pressable>
              );
            })}
          </>
        )}
      </View>

      {/* LOGS DO DISPOSITIVO */}
      <View style={styles.logsCard}>
        <View style={styles.logsHeader}>
          <View style={styles.h3Row}>
            <Icon name="terminal" size={15} color={colors.lime} />
            <Text style={styles.logsTitle}>LOGS DO DISPOSITIVO{espSelecionado ? ` #${espSelecionado}` : ''}</Text>
          </View>
          <Pressable style={styles.darkBtn} onPress={limparLogs}>
            <Icon name="broom" size={12} color={colors.white} />
            <Text style={styles.darkBtnText}>Limpar</Text>
          </Pressable>
        </View>

        {/* <select id="log-filter"> -> chips horizontais (mais natural no toque) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
          {FILTROS.map(([k, label]) => (
            <Pressable key={k} onPress={() => setFiltro(k)} style={[styles.chip, filtro === k && styles.chipActive]}>
              <Text style={[styles.chipText, filtro === k && { color: colors.dark }]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Mais recentes primeiro (o servidor já devolve nessa ordem) */}
        <ScrollView style={styles.logsBox} nestedScrollEnabled>
          {!espSelecionado ? (
            <View style={styles.logsEmpty}>
              <Icon name="microchip" size={14} color="#888" />
              <Text style={styles.logsEmptyText}>
                {ids.length ? 'Selecione um dispositivo para ver os logs' : 'Aguardando logs do dispositivo...'}
              </Text>
            </View>
          ) : logsArr.length === 0 ? (
            <Text style={[styles.logsEmptyText, { textAlign: 'center', padding: 20 }]}>Nenhum log disponível</Text>
          ) : (
            logsArr.map((log) => <LogEntry key={log.id} log={log} />)
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.poppinsExtra, fontSize: 26, color: colors.textDark, marginBottom: 5 },
  sub: { fontFamily: fonts.inter, color: colors.textMid, fontSize: 14 },
  card: { backgroundColor: colors.white, borderRadius: sizes.radiusLg, padding: 24, marginBottom: 30, ...shadows.sm },
  h3Row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  h3: { fontFamily: fonts.poppinsSemi, fontSize: 17, color: colors.textDark },
  vincRow: { flexDirection: 'row', gap: 15, alignItems: 'flex-end', flexWrap: 'wrap' },
  status: { marginTop: 15, padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  empty: { color: colors.textSoft, textAlign: 'center', padding: 20, fontFamily: fonts.inter },
  devCard: {
    backgroundColor: colors.white,
    borderRadius: sizes.radiusLg,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  devTitle: { fontFamily: fonts.poppinsBold, fontSize: 15, color: colors.textDark },
  devName: { fontFamily: fonts.inter, fontSize: 13, color: colors.textMid },
  devDate: { fontFamily: fonts.inter, fontSize: 11, color: colors.textSoft, marginTop: 4 },
  devStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  unlink: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  logsCard: { backgroundColor: colors.dark, borderRadius: sizes.radiusLg, padding: 20, ...shadows.md },
  logsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 },
  logsTitle: { fontFamily: fonts.mono, color: colors.lime, fontSize: 17 },
  darkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  darkBtnText: { color: colors.white, fontFamily: fonts.interSemi, fontSize: 13 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { color: colors.white, fontFamily: fonts.interSemi, fontSize: 12 },
  logsBox: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 14, maxHeight: 400 },
  logsEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  logsEmptyText: { color: '#888', fontFamily: fonts.mono, fontSize: 13 },
});

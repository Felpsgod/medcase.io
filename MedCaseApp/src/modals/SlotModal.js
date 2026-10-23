// =====================================================
// SlotModal (#slot-modal) — configurar posologia de um nicho (maleta) ou tag
// Posologia: Intervalo Fixo (a cada X horas + 1ª dose) ou Horários Manuais.
// =====================================================
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AppModal from '../components/Modal';
import Icon from '../components/Icon';
import { Button, CheckRow, DateField, Field, Input, Row2, SelectField, TimeField, TimeWithNow } from '../components/Form';
import { useData } from '../contexts/DataContext';
import { useToast } from '../components/Toast';
import { removerMedicamento, salvarMedicamento } from '../services/api';
import { UNIDADES_DOSE, calcularFrequencia } from '../utils/doseHelpers';
import { colors, fonts, shadows } from '../theme';

export default function SlotModal({ visible, onClose, id, tipo, isEdit }) {
  const { maletaSlots, pulseiraTags, carregarDados } = useData();
  const toast = useToast();

  const [nome, setNome] = useState('');
  const [doseQtd, setDoseQtd] = useState('');
  const [doseUnidade, setDoseUnidade] = useState('comprimido(s)');
  const [usoContinuo, setUsoContinuo] = useState(false);
  const [dataLimite, setDataLimite] = useState('');
  const [posType, setPosType] = useState('fixo');
  const [intervalo, setIntervalo] = useState('');
  const [freq, setFreq] = useState('');
  const [primeiraDose, setPrimeiraDose] = useState('');
  const [customTimes, setCustomTimes] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const dataAtual = (tipo === 'maleta' ? maletaSlots : pulseiraTags)?.[`${tipo === 'maleta' ? 'slot' : 'tag'}_${id}`];

  // abrirModal(id, isEdit, tipo): preenche ou reseta o formulário
  useEffect(() => {
    if (!visible) return;
    if (isEdit && dataAtual) {
      setNome(dataAtual.nome || '');
      setDoseQtd(dataAtual.dose_qtd ? String(dataAtual.dose_qtd) : '');
      setDoseUnidade(dataAtual.dose_unidade || 'comprimido(s)');
      setUsoContinuo(!!dataAtual.uso_continuo);
      setDataLimite(dataAtual.data_limite || '');
      const t = dataAtual.tipo_posologia || 'fixo';
      setPosType(t);
      setIntervalo(dataAtual.intervalo ? String(dataAtual.intervalo) : '');
      setFreq(dataAtual.frequencia ? String(dataAtual.frequencia) : '');
      setPrimeiraDose(dataAtual.primeira_dose || '');
      setCustomTimes(t === 'custom' && dataAtual.horarios_custom?.length ? [...dataAtual.horarios_custom] : t === 'custom' ? [''] : []);
    } else {
      setNome('');
      setDoseQtd('');
      setDoseUnidade('comprimido(s)');
      setUsoContinuo(false);
      setDataLimite('');
      setPosType('fixo');
      setIntervalo('');
      setFreq('');
      setPrimeiraDose('');
      setCustomTimes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, id, tipo, isEdit]);

  const setPosologyType = (t) => {
    setPosType(t);
    if (t === 'custom' && customTimes.length === 0) setCustomTimes(['']);
  };

  const onIntervalo = (v) => {
    const limpo = v.replace(/[^0-9]/g, '');
    setIntervalo(limpo);
    setFreq(calcularFrequencia(limpo)); // calcularFrequenciaAutomatica
  };

  const toggleUsoContinuo = (v) => {
    setUsoContinuo(v);
    if (v) setDataLimite('');
  };

  const salvarSlot = async () => {
    if (!nome.trim()) return Alert.alert('Atenção', 'Informe o nome do medicamento.');

    // O histórico de tomadas fica no servidor (não precisa ser reenviado).
    // frequência e horarios_calculados também são calculados pelo backend.
    const dados = {
      nome: nome.trim(),
      dose_qtd: doseQtd,
      dose_unidade: doseUnidade,
      uso_continuo: usoContinuo,
      data_limite: usoContinuo ? '' : dataLimite,
      tipo_posologia: posType,
    };

    if (posType === 'fixo') {
      const intNum = parseInt(intervalo, 10);
      if (!intNum || intNum < 1 || intNum > 72) return Alert.alert('Atenção', 'Informe o intervalo em horas (1 a 72).');
      if (!primeiraDose) return Alert.alert('Atenção', 'Informe o horário da primeira dose.');
      dados.intervalo = intNum;
      dados.primeira_dose = primeiraDose;
    } else {
      const horarios = customTimes.filter((v) => v !== '');
      if (horarios.length === 0) return Alert.alert('Atenção', 'Adicione um horário.');
      dados.horarios_custom = [...horarios].sort();
    }

    setSalvando(true);
    try {
      // PUT /api/medicamentos/<maleta|tag>/<id> (o servidor registra a notificação)
      await salvarMedicamento(tipo, id, dados);
      onClose();
      toast('Salvo com sucesso!');
      carregarDados();
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvando(false);
    }
  };

  const limparSlot = () => {
    Alert.alert('Remover', 'Remover este medicamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removerMedicamento(tipo, id); // DELETE /api/medicamentos/<maleta|tag>/<id>
            onClose();
            toast('Removido.');
            carregarDados();
          } catch (e) {
            Alert.alert('Erro', e.message);
          }
        },
      },
    ]);
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      icon={tipo === 'maleta' ? 'pills' : 'tag'}
      title={`Configurar ${id ?? ''}`}
      subtitle="Preencha a posologia do medicamento"
      footer={
        <>
          {isEdit && dataAtual && <Button title="Excluir" icon="trash-can" variant="ghost" onPress={limparSlot} />}
          <Button title={salvando ? 'Salvando...' : 'Salvar Posologia'} icon="check" onPress={salvarSlot} disabled={salvando} />
        </>
      }
    >
      <Field label="Nome do Medicamento">
        <Input value={nome} onChangeText={setNome} placeholder="Ex: Paracetamol 750mg" />
      </Field>

      <Row2>
        <Field label="Dose por tomada">
          <Input value={doseQtd} onChangeText={(v) => setDoseQtd(v.replace(',', '.'))} placeholder="Ex: 1" keyboardType="decimal-pad" />
        </Field>
        <Field label="Unidade">
          <SelectField value={doseUnidade} options={UNIDADES_DOSE} onChange={setDoseUnidade} />
        </Field>
      </Row2>

      <CheckRow label="Uso contínuo (sem data final)" value={usoContinuo} onValueChange={toggleUsoContinuo} />

      {!usoContinuo && (
        <Field label="Até quando tomar? (Data Limite)">
          <DateField value={dataLimite} onChange={setDataLimite} />
        </Field>
      )}

      {/* .posology-toggle */}
      <View style={styles.toggle}>
        {[
          ['fixo', 'Intervalo Fixo'],
          ['custom', 'Horários Manuais'],
        ].map(([k, label]) => (
          <Pressable key={k} style={[styles.posBtn, posType === k && styles.posBtnActive]} onPress={() => setPosologyType(k)}>
            <Text style={[styles.posText, posType === k && styles.posTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {posType === 'fixo' ? (
        <View>
          <Row2>
            <Field label="A cada quantas horas?">
              <Input value={intervalo} onChangeText={onIntervalo} placeholder="Ex: 8" keyboardType="number-pad" maxLength={2} />
            </Field>
            <Field label="Vezes ao dia">
              <Input value={freq} placeholder="Auto" disabled />
            </Field>
          </Row2>
          <Field label="Horário da Primeira Dose">
            <TimeWithNow value={primeiraDose} onChange={setPrimeiraDose} />
          </Field>
        </View>
      ) : (
        <Field label="Defina os horários da rotina">
          {customTimes.map((t, i) => (
            <View key={i} style={styles.timeRow}>
              <TimeField value={t} onChange={(v) => setCustomTimes((arr) => arr.map((x, j) => (j === i ? v : x)))} />
              <Pressable style={styles.removeBtn} onPress={() => setCustomTimes((arr) => arr.filter((_, j) => j !== i))}>
                <Icon name="xmark" size={16} color={colors.pinkDark} />
              </Pressable>
            </View>
          ))}
          <Button
            title="Adicionar Horário"
            icon="plus"
            variant="dashed"
            onPress={() => setCustomTimes((arr) => [...arr, ''])}
            style={{ flex: 0, marginTop: 5 }}
          />
        </Field>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', gap: 10, marginBottom: 20, backgroundColor: colors.bg, padding: 6, borderRadius: 12 },
  posBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  posBtnActive: { backgroundColor: colors.white, ...shadows.sm },
  posText: { fontFamily: fonts.interSemi, fontSize: 13, color: colors.textSoft },
  posTextActive: { color: colors.dark },
  timeRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  removeBtn: { width: 44, height: 48, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});

// =====================================================
// Controles de formulário (.field, .btn, .btn-agora, <select>, <input type=time|date>)
// - <select>  -> SelectField (lista expansível inline; evita Modal dentro de Modal)
// - type=time -> TimeField (DateTimePicker nativo)
// - type=date -> DateField (DateTimePicker nativo)
// =====================================================
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Icon from './Icon';
import { colors, fonts, shadows, sizes } from '../theme';
import { dateParaHora, formatarData, horaAgora, horaParaDate, parseISODate, toLocalISODate } from '../utils/dateHelpers';

/* ---------------- Label + wrapper ---------------- */
export function Field({ label, labelStyle, children, style }) {
  return (
    <View style={[styles.field, style]}>
      {!!label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      {children}
    </View>
  );
}

/* ---------------- Input de texto ---------------- */
export function Input({ style, disabled, multiline, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.textSoft}
      editable={!disabled}
      multiline={multiline}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={[
        styles.input,
        multiline && styles.textarea,
        focus && styles.inputFocus,
        disabled && styles.inputDisabled,
        style,
      ]}
      {...props}
    />
  );
}

/* ---------------- Botões ---------------- */
export function Button({ title, icon, onPress, variant = 'primary', style, textStyle, disabled, color }) {
  const v = variantStyles[variant] || variantStyles.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        v.box,
        color && { backgroundColor: color },
        pressed && { opacity: 0.85, transform: [{ translateY: -1 }] },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {!!icon && <Icon name={icon} size={14} color={v.text.color} />}
      {!!title && <Text style={[styles.btnText, v.text, textStyle]}>{title}</Text>}
    </Pressable>
  );
}

const variantStyles = {
  primary: { box: { backgroundColor: colors.dark }, text: { color: colors.white } },
  green: { box: { backgroundColor: colors.green }, text: { color: colors.white } },
  ghost: { box: { backgroundColor: colors.bg }, text: { color: colors.textMid } },
  danger: {
    box: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pinkDark },
    text: { color: colors.pinkDark },
  },
  dashed: {
    box: { backgroundColor: colors.bg, borderWidth: 1, borderStyle: 'dashed', borderColor: '#ccc', paddingVertical: 8 },
    text: { color: colors.textMid, fontSize: 13 },
  },
};

/* Botão laranja "Agora" (.btn-agora) */
export function AgoraButton({ onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.agora, pressed && { backgroundColor: '#e07900' }]}>
      <Icon name="clock" size={14} color={colors.white} />
      <Text style={styles.agoraText}>Agora</Text>
    </Pressable>
  );
}

/* ---------------- Select ---------------- */
export function SelectField({ value, options, onChange, placeholder = '--', style }) {
  const [open, setOpen] = useState(false);
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const atual = opts.find((o) => o.value === value);
  return (
    <View style={style}>
      <Pressable style={[styles.input, styles.selectBox, open && styles.inputFocus]} onPress={() => setOpen((v) => !v)}>
        <Text style={[styles.inputText, !atual && { color: colors.textSoft }]} numberOfLines={1}>
          {atual ? atual.label : placeholder}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textSoft} />
      </Pressable>
      {open && (
        <View style={styles.optionList}>
          {opts.map((o) => (
            <Pressable
              key={String(o.value)}
              style={({ pressed }) => [styles.option, (pressed || o.value === value) && styles.optionActive]}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <Text style={[styles.optionText, o.value === value && { fontFamily: fonts.interSemi }]}>{o.label}</Text>
              {o.value === value && <Icon name="check" size={12} color={colors.green} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/* ---------------- Time picker (HH:MM) ---------------- */
export function TimeField({ value, onChange, disabled, style }) {
  const [iosOpen, setIosOpen] = useState(false);

  const abrir = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: horaParaDate(value),
        mode: 'time',
        is24Hour: true,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(dateParaHora(date));
        },
      });
    } else {
      setIosOpen((v) => !v);
    }
  };

  // Web não tem picker nativo: cai num TextInput "HH:MM"
  if (Platform.OS === 'web') {
    return <Input value={value} onChangeText={onChange} placeholder="HH:MM" style={style} disabled={disabled} />;
  }

  return (
    <View style={[{ flex: 1 }, style]}>
      <Pressable onPress={abrir} style={[styles.input, styles.selectBox, disabled && styles.inputDisabled]}>
        <Text style={[styles.inputText, { fontFamily: fonts.mono, fontSize: 16 }, !value && { color: colors.textSoft }]}>
          {value || '--:--'}
        </Text>
        <Icon name="clock" regular size={14} color={colors.textSoft} />
      </Pressable>
      {iosOpen && Platform.OS === 'ios' && (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={horaParaDate(value)}
            mode="time"
            display="spinner"
            is24Hour
            locale="pt-BR"
            onChange={(e, d) => d && onChange(dateParaHora(d))}
          />
          <Button title="OK" onPress={() => setIosOpen(false)} style={{ marginTop: 6 }} />
        </View>
      )}
    </View>
  );
}

/* Hora + botão "Agora" (.input-with-btn) */
export function TimeWithNow({ value, onChange, disabled }) {
  return (
    <View style={styles.inputWithBtn}>
      <TimeField value={value} onChange={onChange} disabled={disabled} />
      <AgoraButton onPress={() => onChange(horaAgora())} />
    </View>
  );
}

/* ---------------- Date picker (YYYY-MM-DD) ---------------- */
export function DateField({ value, onChange, placeholder = 'Opcional', allowClear = true }) {
  const [iosOpen, setIosOpen] = useState(false);
  const atual = parseISODate(value) || new Date();

  const abrir = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: atual,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toLocalISODate(date));
        },
      });
    } else {
      setIosOpen((v) => !v);
    }
  };

  if (Platform.OS === 'web') {
    return <Input value={value} onChangeText={onChange} placeholder="AAAA-MM-DD" />;
  }

  return (
    <View>
      <View style={styles.inputWithBtn}>
        <Pressable onPress={abrir} style={[styles.input, styles.selectBox, { flex: 1 }]}>
          <Text style={[styles.inputText, !value && { color: colors.textSoft }]}>{value ? formatarData(value) : placeholder}</Text>
          <Icon name="calendar-day" size={14} color={colors.textSoft} />
        </Pressable>
        {allowClear && !!value && (
          <Pressable style={styles.clearBtn} onPress={() => onChange('')}>
            <Icon name="xmark" size={16} color={colors.pinkDark} />
          </Pressable>
        )}
      </View>
      {iosOpen && Platform.OS === 'ios' && (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={atual}
            mode="date"
            display="inline"
            locale="pt-BR"
            onChange={(e, d) => d && onChange(toLocalISODate(d))}
          />
          <Button title="OK" onPress={() => setIosOpen(false)} style={{ marginTop: 6 }} />
        </View>
      )}
    </View>
  );
}

/* ---------------- Checkbox / switch com rótulo ---------------- */
export function CheckRow({ label, value, onValueChange, bordered = false, bold = false }) {
  return (
    <Pressable style={[styles.checkRow, bordered && styles.checkRowBordered]} onPress={() => onValueChange(!value)}>
      <Text style={[styles.checkLabel, bold && { fontFamily: fonts.interBold, color: colors.textDark }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#ddd', true: 'rgba(4,191,138,0.5)' }}
        thumbColor={value ? colors.green : '#f4f3f4'}
        ios_backgroundColor="#ddd"
      />
    </Pressable>
  );
}

/* Duas colunas (.row-2) — vira 1 coluna em telas muito estreitas */
export function Row2({ children }) {
  return <View style={styles.row2}>{React.Children.map(children, (c) => c && <View style={{ flex: 1, minWidth: 130 }}>{c}</View>)}</View>;
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: {
    fontFamily: fonts.interBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMid,
    marginBottom: 7,
  },
  input: {
    width: '100%',
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: sizes.radiusSm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.textDark,
    fontFamily: fonts.inter,
    fontSize: 16, // 16px evita zoom no iOS (mesma regra do CSS)
    minHeight: 48,
  },
  inputText: { color: colors.textDark, fontFamily: fonts.inter, fontSize: 16, flex: 1 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  inputFocus: { borderColor: colors.green, backgroundColor: colors.white },
  inputDisabled: { backgroundColor: colors.border, color: '#888', opacity: 0.7 },
  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  optionList: {
    marginTop: 6,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    ...shadows.sm,
  },
  option: { paddingVertical: 11, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionActive: { backgroundColor: 'rgba(4,191,138,0.08)' },
  optionText: { fontFamily: fonts.inter, fontSize: 15, color: colors.textDark },
  btn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { fontFamily: fonts.interSemi, fontSize: 15 },
  agora: {
    backgroundColor: colors.orange,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: sizes.radiusSm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadows.orange,
  },
  agoraText: { color: colors.white, fontFamily: fonts.interBold, fontSize: 14 },
  inputWithBtn: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  clearBtn: {
    width: 44,
    height: 48,
    borderRadius: sizes.radiusSm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosPicker: { backgroundColor: colors.bg, borderRadius: 12, padding: 8, marginTop: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, marginBottom: 10 },
  checkRowBordered: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15, marginBottom: 15 },
  checkLabel: { fontFamily: fonts.interMedium, fontSize: 15, color: colors.textDark, flex: 1, paddingRight: 10 },
  row2: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
});

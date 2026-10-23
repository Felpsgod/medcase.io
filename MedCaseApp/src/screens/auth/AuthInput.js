// Campo de texto do login.html (.auth-field)
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import s from './authStyles';
import { colors } from '../../theme';

export default function AuthInput({ label, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSoft}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[s.input, focus && s.inputFocus]}
        {...props}
      />
    </View>
  );
}

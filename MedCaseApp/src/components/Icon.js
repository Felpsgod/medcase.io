// =====================================================
// Wrapper do FontAwesome6 (@expo/vector-icons).
// No HTML quase tudo era "fas" (solid) -> solid por padrão.
// Ícones de marca (fab fa-whatsapp) -> <Icon name="whatsapp" brand />
// =====================================================
import React from 'react';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { colors } from '../theme';

export default function Icon({ name, size = 16, color = colors.textDark, brand = false, regular = false, style }) {
  const styleProps = brand ? { brand: true } : regular ? {} : { solid: true };
  return <FontAwesome6 name={name} size={size} color={color} style={style} {...styleProps} />;
}

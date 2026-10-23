// =====================================================
// Fontes: Inter, Poppins e Share Tech Mono (Google Fonts)
// No React Native cada peso é uma família separada, então
// "font-weight: 700" vira fontFamily: fonts.interBold, etc.
// =====================================================
// Importa só os pesos usados (importar do índice do pacote embutiria
// todos os pesos/itálicos no app, ~5 MB a mais).
import { Inter_300Light } from '@expo-google-fonts/inter/300Light';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { Poppins_800ExtraBold } from '@expo-google-fonts/poppins/800ExtraBold';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono/400Regular';

// Mapa passado para useFonts() no App.js
export const fontAssets = {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  ShareTechMono_400Regular,
};

export const fonts = {
  interLight: 'Inter_300Light',
  inter: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemi: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
  poppinsMedium: 'Poppins_500Medium',
  poppinsSemi: 'Poppins_600SemiBold',
  poppinsBold: 'Poppins_700Bold',
  poppinsExtra: 'Poppins_800ExtraBold',
  mono: 'ShareTechMono_400Regular',
};

export default fonts;

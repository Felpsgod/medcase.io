// =====================================================
// Sombras: box-shadow do CSS -> Platform.select
// iOS usa shadow*, Android usa elevation.
// =====================================================
import { Platform } from 'react-native';

const make = (opacity, radius, offsetY, elevation, color = '#000') =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation, shadowColor: color },
    default: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
  });

export const shadows = {
  sm: make(0.05, 8, 4, 2), // --shadow-sm
  md: make(0.08, 20, 10, 6), // --shadow-md
  lg: make(0.2, 25, 20, 12), // modal / toast
  dropdown: make(0.12, 25, 15, 10),
  green: make(0.3, 6, 4, 4, '#04BF8A'),
  pink: make(0.2, 10, 10, 6, '#F272C5'),
  orange: make(0.2, 6, 4, 3, '#FF8A00'),
};

export default shadows;

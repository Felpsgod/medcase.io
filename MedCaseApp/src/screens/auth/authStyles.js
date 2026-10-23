// Estilos compartilhados de login.html (.auth-card, .auth-field, .btn-auth)
import { StyleSheet } from 'react-native';
import { colors, fonts, shadows } from '../../theme';

export default StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.dark },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    backgroundColor: colors.white,
    width: '100%',
    maxWidth: 400,
    paddingVertical: 36,
    paddingHorizontal: 28,
    borderRadius: 28,
    alignItems: 'stretch',
    ...shadows.lg,
  },
  title: { fontFamily: fonts.poppinsBold, fontSize: 30, color: colors.dark, marginBottom: 5, textAlign: 'center' },
  subtitle: { fontFamily: fonts.inter, color: colors.textSoft, fontSize: 14, marginBottom: 28, textAlign: 'center' },
  field: { marginBottom: 16 },
  label: { fontFamily: fonts.interBold, fontSize: 12, color: colors.textMid, marginBottom: 6, letterSpacing: 0.6, textTransform: 'uppercase' },
  input: {
    width: '100%',
    padding: 14,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 15,
    fontFamily: fonts.inter,
    fontSize: 16, // evita zoom automático do iOS
    color: colors.textDark,
  },
  inputFocus: { borderColor: colors.green, backgroundColor: colors.white },
  btn: {
    width: '100%',
    padding: 16,
    backgroundColor: colors.dark,
    borderRadius: 15,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  btnText: { color: colors.white, fontFamily: fonts.interBold, fontSize: 16 },
  forgot: { marginTop: 20, fontFamily: fonts.inter, fontSize: 13, color: colors.textSoft, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 25 },
  switchText: { fontFamily: fonts.inter, fontSize: 14, color: colors.textMid, textAlign: 'center' },
  switchLink: { color: colors.green, fontFamily: fonts.interBold },
});

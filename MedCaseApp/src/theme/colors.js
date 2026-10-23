// =====================================================
// Cores e medidas extraídas do :root do painel.html
// =====================================================

export const colors = {
  pinkLight: '#F2A2A9', // --c-pink-light
  pinkDark: '#F272C5', // --c-pink-dark
  green: '#04BF8A', // --c-green
  peach: '#F2BE7E', // --c-peach
  bg: '#F2F2F2', // --c-bg
  dark: '#181818', // --c-dark
  lime: '#ABD164', // --c-lime
  peachAlt1: '#FEBF90', // --c-peach-alt1
  peachAlt2: '#FFCE7F', // --c-peach-alt2
  orange: '#FF8A00', // --c-orange

  textDark: '#181818', // --text-dark
  textMid: '#555555', // --text-mid
  textSoft: '#999999', // --text-soft
  border: '#e2e8f0', // --border

  white: '#FFFFFF',
  black: '#000000',
  moon: '#A1B5D8', // cor do ícone de lua (formatarHoraAMPM)
  sun: '#F2BE7E', // cor do ícone de sol (formatarHoraAMPM)

  // Badges de log (.log-badge.*)
  log: {
    SISTEMA: { bg: 'rgba(100,149,237,0.3)', fg: '#6495ED' },
    ALERTA: { bg: 'rgba(255,99,71,0.3)', fg: '#FF6347' },
    ERRO: { bg: 'rgba(220,20,60,0.3)', fg: '#DC143C' },
    SUCESSO: { bg: 'rgba(50,205,50,0.3)', fg: '#32CD32' },
    INFO: { bg: 'rgba(135,206,250,0.3)', fg: '#87CEFA' },
  },
};

export const sizes = {
  sidebarW: 260, // --sidebar-w
  sidebarWCol: 90, // --sidebar-w-col
  radiusLg: 24, // --radius-lg
  radiusMd: 16, // --radius-md
  radiusSm: 10, // --radius-sm
  // Equivalente às media queries do CSS
  breakpointMobile: 768,
  breakpointSmall: 480,
  breakpointWide: 900, // a partir daqui o dashboard fica em 2 colunas
};

export default colors;

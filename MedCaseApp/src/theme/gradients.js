// =====================================================
// Gradientes (expo-linear-gradient)
// CSS "linear-gradient(135deg, A 0%, B 100%)" equivale a
// start {x:0,y:0} -> end {x:1,y:1}.
// =====================================================

export const GRAD_START = { x: 0, y: 0 };
export const GRAD_END = { x: 1, y: 1 };

// No painel.html só --grad-1..3 estavam definidos; as classes bg-c4..bg-c8
// referenciavam variáveis inexistentes (ficavam sem fundo). Aqui completamos
// os 8 gradientes com tons da mesma paleta para cada slot/tag ter cor única.
export const gradients = {
  c1: ['#F2A2A9', '#F272C5'], // --grad-1 (rosa)
  c2: ['#ABD164', '#04BF8A'], // --grad-2 (verde)
  c3: ['#FFCE7F', '#FEBF90'], // --grad-3 (pêssego)
  c4: ['#74ebd5', '#04BF8A'], // água-marinha
  c5: ['#FF9A9E', '#F272C5'], // coral
  c6: ['#a18cd1', '#F272C5'], // lilás
  c7: ['#F2BE7E', '#FF8A00'], // laranja
  c8: ['#84fab0', '#8fd3f4'], // menta / azul
};

export const colorPalette = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];

// Cores da timeline (.tl-c1 .. .tl-c6): borda esquerda + fundo suave
export const timelineColors = [
  { border: '#F2A2A9', bg: 'rgba(242,162,169,0.08)' },
  { border: '#04BF8A', bg: 'rgba(4,191,138,0.08)' },
  { border: '#F2BE7E', bg: 'rgba(242,190,126,0.08)' },
  { border: '#74ebd5', bg: 'rgba(116,235,213,0.08)' },
  { border: '#FF9A9E', bg: 'rgba(255,154,158,0.08)' },
  { border: '#a18cd1', bg: 'rgba(161,140,209,0.08)' },
];

// Barras decorativas do card "Adesão Diária" (.bar-col:nth-child)
export const dailyBars = [
  { h: 0.4, color: '#F272C5' },
  { h: 0.6, color: '#F2A2A9' },
  { h: 0.8, color: '#04BF8A' },
  { h: 1.0, color: '#04BF8A' },
  { h: 0.5, color: '#F2BE7E' },
  { h: 0.3, color: '#FEBF90' },
];

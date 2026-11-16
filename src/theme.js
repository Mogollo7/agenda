// Material 3 (esquema oscuro) sembrado con el violeta Nocturne + escala áurea (φ).
export const PHI = 1.618;
export const c = {
  bg: '#161826', surface: '#1f2131', surfaceHigh: '#2a2c3d', surfaceHighest: '#353748',
  text: '#e6e1ec', mute: 'rgba(230,225,236,0.70)', faint: 'rgba(230,225,236,0.58)',
  line: '#47485a', outline: '#928fa3',
  primary: '#cbc1ff', onPrimary: '#32295f', primaryContainer: '#493f7d', onPrimaryContainer: '#e7e0ff',
  secContainer: '#3f3b58', onSecContainer: '#e4dff9',
  error: '#ffb4ab', errorContainer: '#8c1d18', onErrorContainer: '#ffdad6',
  inverse: '#e5e1ec', onInverse: '#2f303b',
  ok: '#7fd6a0', warn: '#e0a46c',
  // alias heredados (App.js) → roles M3
  a: '#cbc1ff', a300: '#e7e0ff', a400: '#cbc1ff', a600: '#9b8fe0', a800: '#493f7d', a900: '#2b2741',
  n500: '#928fa3', n700: '#47485a', err: '#ffb4ab',
};
// Tipografía: ÷φ, base 16, ×φ, ×φ². Piso 11px. `scale` viene de Ajustes.
export const fs = (n, scale = 1) => Math.max(11, Math.round(16 * Math.pow(PHI, n) * scale));
export const sp = { xs: 6, sm: 10, md: 16, lg: 26, xl: 42 };
// Formas M3: xs 4 · sm 8 · md 12 · lg 16 · xl 28 · pill
export const r = { xs: 4, sm: 8, md: 12, lg: 16, xl: 28, pill: 999 };

// Concentricidad: radio interior = max(0, exterior - separación).
export const inner = (outer, inset) => Math.max(0, outer - inset);
// Por esquina: insets {top,right,bottom,left}; cada esquina usa la mayor de sus dos separaciones adyacentes.
export const innerCorners = (outer, { top = 0, right = 0, bottom = 0, left = 0 } = {}) => ({
  borderTopLeftRadius: inner(outer, Math.max(top, left)), borderTopRightRadius: inner(outer, Math.max(top, right)),
  borderBottomRightRadius: inner(outer, Math.max(bottom, right)), borderBottomLeftRadius: inner(outer, Math.max(bottom, left)),
});

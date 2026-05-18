// Editorial Premium — warm parchment, ink black, deep slate teal signature, terracotta highlight.
// Hand-picked palette inspired by editorial print design. No generic violet/blue.

export const colors = {
  bg: '#f4f1ea',           // parchment cream
  surface: '#ffffff',       // paper white
  surfaceLight: '#faf7f0',
  elevated: '#ffffff',
  border: '#e3ddd0',        // warm beige
  borderLight: '#ece6d6',
  primary: '#1c1b18',       // warm near-black ink
  primaryDark: '#0f0e0c',
  primaryLight: '#3a382f',
  primaryGlow: 'rgba(28,27,24,0.06)',
  accent: '#2f4858',        // deep slate teal — signature
  accentLight: '#577488',
  success: '#5d7a5d',       // muted sage
  successLight: '#85a085',
  warning: '#b6803d',       // warm ochre
  danger: '#a8392c',        // deep terracotta red
  dangerDark: '#7a2920',
  patch: '#c4533a',         // terracotta highlight
  textPrimary: '#1c1b18',
  textSecondary: '#5a564c',
  textMuted: '#8a857a',
  glass: 'rgba(255,255,255,0.78)',
  glassLight: 'rgba(255,255,255,0.55)',
  overlay: 'rgba(28,27,24,0.32)',
} as const;

export const gradients = {
  primary: ['#3a382f', '#1c1b18', '#0f0e0c'] as const,
  primaryBright: ['#4a4838', '#2c2a22', '#1c1b18'] as const,
  accent: ['#577488', '#2f4858', '#1f3340'] as const,
  accentSoft: ['rgba(47,72,88,0.10)', 'rgba(47,72,88,0.05)'] as const,
  success: ['#85a085', '#5d7a5d', '#445b44'] as const,
  danger: ['#d97560', '#a8392c', '#7a2920'] as const,
  warning: ['#d9a878', '#b6803d', '#8a5e2a'] as const,
  surface: ['#ffffff', '#faf7f0'] as const,
  dark: ['#f4f1ea', '#ece6d6'] as const,
  card: ['#ffffff', '#faf7f0'] as const,
  shimmer: ['transparent', 'rgba(28,27,24,0.04)', 'transparent'] as const,
  aurora: ['#faf7f0', '#f4f1ea', '#efe9da'] as const,
  auroraWarm: ['#fbf4e8', '#f6ebd6', '#fbf4e8'] as const,
  gold: ['#e0c285', '#b6803d', '#7a5520'] as const,
  silver: ['#d8d2c4', '#9a9485', '#5a564c'] as const,
  bronze: ['#d99878', '#c4533a', '#7a2920'] as const,
  splash: ['#faf7f0', '#f4f1ea', '#efe9da'] as const,
} as const;

export const eventColors = {
  speed_breaker: '#b6803d',  // ochre
  pothole: '#a8392c',        // terracotta red
  broken_patch: '#c4533a',   // terracotta
  resolved: '#5d7a5d',       // sage
  anomaly: '#5a564c',        // warm grey
} as const;

export const eventGradients = {
  speed_breaker: ['#d9a878', '#b6803d', '#8a5e2a'] as const,
  pothole: ['#d97560', '#a8392c', '#7a2920'] as const,
  broken_patch: ['#dc8568', '#c4533a', '#8e3825'] as const,
  resolved: ['#85a085', '#5d7a5d', '#445b44'] as const,
  anomaly: ['#9a9485', '#5a564c', '#3a382f'] as const,
} as const;

export const severityColors = {
  CRITICAL: '#a8392c',
  HIGH: '#c4533a',
  MEDIUM: '#b6803d',
  LOW: '#5d7a5d',
} as const;

export const qualityColors = {
  Excellent: '#5d7a5d',
  Good: '#85a085',
  Fair: '#b6803d',
  Poor: '#c4533a',
  'Very Poor': '#a8392c',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 } as const;
export const radius = { sm: 8, card: 16, modal: 24, pill: 999 } as const;

export const shadows = {
  sm: { shadowColor: '#1c1b18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  md: { shadowColor: '#1c1b18', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 4 },
  lg: { shadowColor: '#1c1b18', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 8 },
  glow: (color: string) => ({ shadowColor: color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 }),
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.9, color: '#1c1b18' },
  h1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.5, color: '#1c1b18' },
  h2: { fontSize: 19, fontWeight: '600' as const, letterSpacing: -0.2, color: '#1c1b18' },
  h3: { fontSize: 16, fontWeight: '600' as const, color: '#1c1b18' },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21, color: '#5a564c' },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const, color: '#3a382f' },
  caption: { fontSize: 12, fontWeight: '400' as const, color: '#8a857a' },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 1.0, color: '#2f4858' },
} as const;

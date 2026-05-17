export const colors = {
  bg: '#f5f5f7',
  surface: '#ffffff',
  surfaceLight: '#f7f7fb',
  elevated: '#ffffff',
  border: '#e5e5ea',
  borderLight: '#f2f2f7',
  primary: '#111827',
  primaryDark: '#030712',
  primaryLight: '#374151',
  primaryGlow: 'rgba(17, 24, 39, 0.08)',
  accent: '#007aff',
  accentLight: '#5ac8fa',
  success: '#10b981',
  successLight: '#34d399',
  warning: '#ff9f0a',
  danger: '#ff3b30',
  dangerDark: '#d70015',
  patch: '#ff7a1a',
  textPrimary: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#8e8e93',
  glass: 'rgba(255, 255, 255, 0.78)',
  glassLight: 'rgba(255, 255, 255, 0.56)',
  overlay: 'rgba(17, 24, 39, 0.36)',
} as const;

export const gradients = {
  primary: ['#111827', '#030712'] as const,
  primaryBright: ['#1f2937', '#111827', '#030712'] as const,
  accent: ['#5ac8fa', '#007aff', '#0a58ca'] as const,
  danger: ['#ff6b64', '#ff3b30', '#d70015'] as const,
  surface: ['#ffffff', '#fbfbfd', '#f2f2f7'] as const,
  dark: ['#ffffff', '#f5f5f7'] as const,
  card: ['rgba(255,255,255,0.98)', 'rgba(248,250,252,0.96)'] as const,
  shimmer: ['transparent', 'rgba(17,24,39,0.045)', 'transparent'] as const,
  aurora: ['#ffffff', '#eef6ff', '#f7f2ff'] as const,
} as const;

export const eventColors = {
  speed_breaker: '#f59e0b',
  pothole: '#ef4444',
  broken_patch: '#f97316',
  resolved: '#10b981',
  anomaly: '#94a3b8',
} as const;

export const eventGradients = {
  speed_breaker: ['#fbbf24', '#f59e0b', '#d97706'] as const,
  pothole: ['#f87171', '#ef4444', '#dc2626'] as const,
  broken_patch: ['#fb923c', '#f97316', '#ea580c'] as const,
  resolved: ['#34d399', '#10b981', '#059669'] as const,
  anomaly: ['#94a3b8', '#64748b', '#475569'] as const,
} as const;

export const severityColors = {
  CRITICAL: '#dc2626',
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#84cc16',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const radius = {
  sm: 12,
  card: 22,
  modal: 30,
  pill: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  md: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 6,
  },
  lg: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 10,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  }),
} as const;

export const typography = {
  display: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1.1, color: '#111827' },
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.6, color: '#111827' },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2, color: '#111827' },
  h3: { fontSize: 16, fontWeight: '700' as const, color: '#111827' },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22, color: '#4b5563' },
  bodyMedium: { fontSize: 15, fontWeight: '600' as const, color: '#4b5563' },
  caption: { fontSize: 12, fontWeight: '500' as const, color: '#8e8e93' },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.1, color: '#4b5563' },
} as const;

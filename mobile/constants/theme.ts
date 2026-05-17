export const colors = {
  bg: '#0d0221',
  surface: '#1a1035',
  elevated: '#241548',
  border: '#2d1f5e',
  primary: '#7c3aed',
  primaryLight: '#a78bfa',
  primaryGlow: 'rgba(124, 58, 237, 0.25)',
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  patch: '#f97316',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
} as const;

export const eventColors = {
  speed_breaker: '#f59e0b',
  pothole: '#ef4444',
  broken_patch: '#f97316',
  resolved: '#10b981',
  anomaly: '#94a3b8',
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
} as const;

export const radius = {
  card: 8,
  modal: 12,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700' as const },
  h1: { fontSize: 24, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '600' as const },
  h3: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.5 },
} as const;

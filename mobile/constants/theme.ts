export const colors = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceLight: '#f1f5f9',
  elevated: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  primary: '#0f172a',
  primaryDark: '#020617',
  primaryLight: '#334155',
  primaryGlow: 'rgba(15, 23, 42, 0.1)',
  accent: '#2563eb',
  accentLight: '#3b82f6',
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  patch: '#f97316',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  glass: 'rgba(255, 255, 255, 0.85)',
  glassLight: 'rgba(255, 255, 255, 0.65)',
  overlay: 'rgba(0, 0, 0, 0.4)',
} as const;

export const gradients = {
  primary: ['#1e293b', '#0f172a', '#020617'] as const,
  primaryBright: ['#334155', '#1e293b', '#0f172a'] as const,
  accent: ['#3b82f6', '#2563eb', '#1d4ed8'] as const,
  danger: ['#ef4444', '#dc2626', '#b91c1c'] as const,
  surface: ['#ffffff', '#f8fafc', '#f1f5f9'] as const,
  dark: ['#ffffff', '#f8fafc'] as const,
  card: ['#ffffff', '#ffffff'] as const,
  shimmer: ['transparent', 'rgba(0,0,0,0.04)', 'transparent'] as const,
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
  sm: 8,
  card: 16,
  modal: 24,
  pill: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
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
  display: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5, color: '#0f172a' },
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3, color: '#0f172a' },
  h2: { fontSize: 20, fontWeight: '600' as const, color: '#0f172a' },
  h3: { fontSize: 16, fontWeight: '600' as const, color: '#0f172a' },
  body: { fontSize: 14, fontWeight: '400' as const, color: '#475569' },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const, color: '#475569' },
  caption: { fontSize: 12, fontWeight: '400' as const, color: '#94a3b8' },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8, color: '#475569' },
} as const;

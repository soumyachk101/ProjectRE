export const colors = {
  bg: '#0d0221',
  surface: '#1a1035',
  surfaceLight: '#241548',
  elevated: '#2d1b5e',
  border: '#3d2a7a',
  borderLight: '#4d3a8a',
  primary: '#7c3aed',
  primaryDark: '#6d28d9',
  primaryLight: '#a78bfa',
  primaryGlow: 'rgba(124, 58, 237, 0.25)',
  accent: '#06b6d4',
  accentLight: '#22d3ee',
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  patch: '#f97316',
  textPrimary: '#f8fafc',
  textSecondary: '#a5b4c8',
  textMuted: '#5b6b82',
  glass: 'rgba(26, 16, 53, 0.72)',
  glassLight: 'rgba(45, 27, 94, 0.55)',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export const gradients = {
  primary: ['#7c3aed', '#6d28d9', '#5b21b6'] as const,
  primaryBright: ['#a78bfa', '#7c3aed', '#6d28d9'] as const,
  accent: ['#06b6d4', '#0891b2', '#0e7490'] as const,
  danger: ['#ef4444', '#dc2626', '#b91c1c'] as const,
  surface: ['#1a1035', '#241548', '#2d1b5e'] as const,
  dark: ['#0d0221', '#1a1035'] as const,
  card: ['#241548', '#1a1035'] as const,
  shimmer: ['transparent', 'rgba(255,255,255,0.04)', 'transparent'] as const,
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
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }),
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '600' as const },
  h3: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8 },
} as const;

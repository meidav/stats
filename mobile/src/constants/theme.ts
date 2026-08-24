export const colors = {
  background: '#EFF6FF',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#334155',
  onGlass: '#FFF7ED',
  onGlassMuted: '#FDE8D0',
  linkOnGlass: '#BFDBFE',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  accent: '#F97316',
  border: '#E2E8F0',
  danger: '#DC2626',
  success: '#16A34A',
  win: '#059669',
  loss: '#E11D48',
  neutral: '#2563EB',
  errorFill: 'rgba(190, 24, 93, 0.94)',
  errorBorder: 'rgba(255, 220, 230, 0.7)',
};

export const gradients = {
  screen: ['#93C5FD', '#C4B5FD', '#FDBA74'],
  screenLocations: [0, 0.55, 1],
  button: ['#2563EB', '#4F46E5'],
  brandText: ['#2563EB', '#6366F1'],
} as const;

export const glass = {
  backgroundColor: 'rgba(76, 29, 149, 0.28)',
  borderColor: 'rgba(196, 181, 253, 0.38)',
  shadowColor: '#2E1065',
  shadowOpacity: 0.16,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
} as const;

export const glassLight = {
  backgroundColor: 'rgba(255, 252, 248, 0.52)',
  borderColor: 'rgba(255, 255, 255, 0.72)',
  shadowColor: '#475569',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

export const glassPeach = {
  backgroundColor: 'rgba(253, 186, 116, 0.55)',
  borderColor: 'rgba(251, 146, 60, 0.5)',
  shadowColor: '#C2410C',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

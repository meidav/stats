export const colors = {
  background: '#EFF6FF',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  accent: '#F97316',
  border: '#E2E8F0',
  danger: '#DC2626',
  success: '#16A34A',
};

export const gradients = {
  screen: ['#93C5FD', '#C4B5FD', '#FDBA74'],
  screenLocations: [0, 0.55, 1],
  button: ['#2563EB', '#4F46E5'],
  brandText: ['#2563EB', '#6366F1'],
} as const;

export const glass = {
  backgroundColor: 'rgba(255, 255, 255, 0.28)',
  borderColor: 'rgba(255, 255, 255, 0.45)',
  shadowColor: '#1E3A8A',
  shadowOpacity: 0.12,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export type ThemeId = 'playtracker' | 'nightCourt' | 'broadcast' | 'harbor' | 'classic';

export type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  onGlass: string;
  onGlassMuted: string;
  linkOnGlass: string;
  primary: string;
  primaryDark: string;
  accent: string;
  border: string;
  /** Text fields / search bars */
  fieldBg: string;
  fieldBorder: string;
  danger: string;
  success: string;
  win: string;
  loss: string;
  neutral: string;
  errorFill: string;
  errorBorder: string;
  tabInactive: string;
  tabBarBorder: string;
  scrim: string;
  cardTitle: string;
  cardBody: string;
};

export type ThemeGradients = {
  screen: readonly [string, string, string];
  screenLocations: readonly [number, number, number];
  button: readonly [string, string];
  brandText: readonly [string, string];
  modal: readonly [string, string, string];
  modalDanger: readonly [string, string, string];
  header: readonly [string, string, string];
};

export type GlassStyle = {
  backgroundColor: string;
  borderColor: string;
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

export type AppTheme = {
  id: ThemeId;
  label: string;
  summary: string;
  isDark: boolean;
  colors: ThemeColors;
  gradients: ThemeGradients;
  glass: GlassStyle;
  glassLight: GlassStyle;
  glassPeach: GlassStyle;
  tabBarBlur: 'light' | 'dark' | 'chromeMaterial' | 'systemChromeMaterial';
  tabBarFallback: string;
};

export const THEME_ORDER: ThemeId[] = [
  'playtracker',
  'classic',
  'nightCourt',
  'broadcast',
  'harbor',
];

export const themes: Record<ThemeId, AppTheme> = {
  playtracker: {
    id: 'playtracker',
    label: 'PlayTracker',
    summary: 'Blue sky, soft peach, current brand.',
    isDark: false,
    colors: {
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
      fieldBg: 'rgba(255, 252, 248, 0.72)',
      fieldBorder: 'rgba(148, 163, 184, 0.45)',
      danger: '#DC2626',
      success: '#16A34A',
      win: '#059669',
      loss: '#E11D48',
      neutral: '#2563EB',
      errorFill: 'rgba(190, 24, 93, 0.94)',
      errorBorder: 'rgba(255, 220, 230, 0.7)',
      tabInactive: 'rgba(15, 23, 42, 0.45)',
      tabBarBorder: 'rgba(255, 255, 255, 0.55)',
      scrim: 'rgba(30, 58, 138, 0.42)',
      cardTitle: '#1E3A8A',
      cardBody: '#1D4ED8',
    },
    gradients: {
      screen: ['#93C5FD', '#C4B5FD', '#FDBA74'],
      screenLocations: [0, 0.55, 1],
      button: ['#2563EB', '#4F46E5'],
      brandText: ['#F97316', '#7C3AED'],
      modal: ['#BFDBFE', '#C4B5FD', '#93C5FD'],
      modalDanger: ['#FECACA', '#FDBA74', '#FB7185'],
      header: ['#BFDBFE', '#DDD6FE', '#FED7AA'],
    },
    glass: {
      backgroundColor: 'rgba(76, 29, 149, 0.28)',
      borderColor: 'rgba(196, 181, 253, 0.38)',
      shadowColor: '#2E1065',
      shadowOpacity: 0.16,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    glassLight: {
      backgroundColor: 'rgba(255, 252, 248, 0.52)',
      borderColor: 'rgba(255, 255, 255, 0.72)',
      shadowColor: '#475569',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    glassPeach: {
      backgroundColor: 'rgba(253, 186, 116, 0.55)',
      borderColor: 'rgba(251, 146, 60, 0.5)',
      shadowColor: '#C2410C',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    tabBarBlur: 'light',
    tabBarFallback: 'rgba(255, 255, 255, 0.78)',
  },
  classic: {
    id: 'classic',
    label: 'Classic',
    summary: 'Legacy navy with sky-blue titles.',
    isDark: true,
    colors: {
      background: '#121820',
      surface: '#20242E',
      text: '#E0E4EB',
      textMuted: '#8893A7',
      onGlass: '#E0E4EB',
      onGlassMuted: '#B0B8C4',
      linkOnGlass: '#66CFFF',
      primary: '#66CFFF',
      primaryDark: '#3AB8F0',
      accent: '#FF9F0A',
      border: '#343E4B',
      fieldBg: '#283443',
      fieldBorder: '#343E4B',
      danger: '#FF3B30',
      success: '#34C759',
      win: '#34C759',
      loss: '#FF3B30',
      neutral: '#66CFFF',
      errorFill: 'rgba(127, 29, 29, 0.92)',
      errorBorder: 'rgba(252, 165, 165, 0.45)',
      tabInactive: 'rgba(224, 228, 235, 0.48)',
      tabBarBorder: 'rgba(255, 255, 255, 0.18)',
      scrim: 'rgba(0, 0, 0, 0.62)',
      cardTitle: '#E0E4EB',
      cardBody: '#B0B8C4',
    },
    gradients: {
      screen: ['#121820', '#1A1E29', '#181C26'],
      screenLocations: [0, 0.55, 1],
      button: ['#3A7CA5', '#1F4E6B'],
      brandText: ['#66CFFF', '#99DDFF'],
      modal: ['#1A1E29', '#20242E', '#1A1E29'],
      modalDanger: ['#7F1D1D', '#9A3412', '#881337'],
      header: ['#181C26', '#1A1E29', '#121820'],
    },
    glass: {
      backgroundColor: 'rgba(32, 36, 46, 0.88)',
      borderColor: 'rgba(102, 207, 255, 0.22)',
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    glassLight: {
      backgroundColor: 'rgba(32, 36, 46, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.14)',
      shadowColor: '#000000',
      shadowOpacity: 0.28,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    glassPeach: {
      backgroundColor: 'rgba(58, 124, 165, 0.4)',
      borderColor: 'rgba(102, 207, 255, 0.35)',
      shadowColor: '#000000',
      shadowOpacity: 0.25,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    tabBarBlur: 'dark',
    tabBarFallback: 'rgba(18, 24, 32, 0.94)',
  },
  nightCourt: {
    id: 'nightCourt',
    label: 'Night Court',
    summary: 'Coal canvas with a bright blue accent.',
    isDark: true,
    colors: {
      background: '#0F0F0F',
      surface: '#1A1A1A',
      text: '#F2F2F2',
      textMuted: '#A0A0A0',
      onGlass: '#F8FAFC',
      onGlassMuted: '#CBD5E1',
      linkOnGlass: '#93C5FD',
      primary: '#60A5FA',
      primaryDark: '#3B82F6',
      accent: '#F97316',
      border: '#2A2A2A',
      fieldBg: 'rgba(255,255,255,0.06)',
      fieldBorder: 'rgba(255,255,255,0.16)',
      danger: '#F87171',
      success: '#34D399',
      win: '#34D399',
      loss: '#FB7185',
      neutral: '#60A5FA',
      errorFill: 'rgba(127, 29, 29, 0.92)',
      errorBorder: 'rgba(252, 165, 165, 0.45)',
      tabInactive: 'rgba(242, 242, 242, 0.48)',
      tabBarBorder: 'rgba(255, 255, 255, 0.22)',
      scrim: 'rgba(0, 0, 0, 0.62)',
      cardTitle: '#F8FAFC',
      cardBody: '#CBD5E1',
    },
    gradients: {
      screen: ['#0F0F0F', '#171717', '#1E293B'],
      screenLocations: [0, 0.55, 1],
      button: ['#2563EB', '#1D4ED8'],
      brandText: ['#93C5FD', '#F97316'],
      modal: ['#1E293B', '#273449', '#1E293B'],
      modalDanger: ['#7F1D1D', '#9A3412', '#881337'],
      header: ['#111827', '#1E293B', '#0F172A'],
    },
    glass: {
      backgroundColor: 'rgba(30, 41, 59, 0.72)',
      borderColor: 'rgba(148, 163, 184, 0.28)',
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    glassLight: {
      backgroundColor: 'rgba(26, 26, 26, 0.78)',
      borderColor: 'rgba(255, 255, 255, 0.22)',
      shadowColor: '#000000',
      shadowOpacity: 0.28,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    glassPeach: {
      backgroundColor: 'rgba(154, 52, 18, 0.42)',
      borderColor: 'rgba(251, 146, 60, 0.35)',
      shadowColor: '#000000',
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    tabBarBlur: 'dark',
    tabBarFallback: 'rgba(18, 18, 24, 0.92)',
  },
  broadcast: {
    id: 'broadcast',
    label: 'Broadcast',
    summary: 'Scoreboard black with sports-red punch.',
    isDark: true,
    colors: {
      background: '#0D0D0D',
      surface: '#151515',
      text: '#E8E8E8',
      textMuted: '#A3A3A3',
      onGlass: '#FFFFFF',
      onGlassMuted: '#FECACA',
      linkOnGlass: '#FCA5A5',
      primary: '#D4001A',
      primaryDark: '#B00016',
      accent: '#FF4D4D',
      border: '#2A2A2A',
      fieldBg: 'rgba(255,255,255,0.06)',
      fieldBorder: 'rgba(255,255,255,0.16)',
      danger: '#FF6B6B',
      success: '#22C55E',
      win: '#22C55E',
      loss: '#FF4D4D',
      neutral: '#E8E8E8',
      errorFill: 'rgba(127, 29, 29, 0.94)',
      errorBorder: 'rgba(252, 165, 165, 0.5)',
      tabInactive: 'rgba(232, 232, 232, 0.45)',
      tabBarBorder: 'rgba(255, 255, 255, 0.2)',
      scrim: 'rgba(0, 0, 0, 0.7)',
      cardTitle: '#FFFFFF',
      cardBody: '#E5E5E5',
    },
    gradients: {
      screen: ['#0D0D0D', '#171717', '#2A0A0A'],
      screenLocations: [0, 0.6, 1],
      button: ['#D4001A', '#8B0000'],
      brandText: ['#FF6B6B', '#FDBA74'],
      modal: ['#1C1C1C', '#2A1212', '#1C1C1C'],
      modalDanger: ['#7F1D1D', '#991B1B', '#450A0A'],
      header: ['#141414', '#1A0A0A', '#0D0D0D'],
    },
    glass: {
      backgroundColor: 'rgba(28, 28, 28, 0.82)',
      borderColor: 'rgba(212, 0, 26, 0.28)',
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    glassLight: {
      backgroundColor: 'rgba(21, 21, 21, 0.86)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    glassPeach: {
      backgroundColor: 'rgba(127, 29, 29, 0.55)',
      borderColor: 'rgba(248, 113, 113, 0.4)',
      shadowColor: '#000000',
      shadowOpacity: 0.28,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    tabBarBlur: 'dark',
    tabBarFallback: 'rgba(16, 12, 12, 0.94)',
  },
  harbor: {
    id: 'harbor',
    label: 'Harbor',
    summary: 'Cool slate blue and soft sand.',
    isDark: false,
    colors: {
      background: '#F1F5F9',
      surface: '#F8FAFC',
      text: '#0F172A',
      textMuted: '#475569',
      onGlass: '#F8FAFC',
      onGlassMuted: '#CBD5E1',
      linkOnGlass: '#BAE6FD',
      primary: '#0369A1',
      primaryDark: '#075985',
      accent: '#EA580C',
      border: '#D0D9E4',
      fieldBg: 'rgba(248, 250, 252, 0.78)',
      fieldBorder: 'rgba(15, 23, 42, 0.12)',
      danger: '#DC2626',
      success: '#059669',
      win: '#059669',
      loss: '#E11D48',
      neutral: '#0369A1',
      errorFill: 'rgba(153, 27, 27, 0.92)',
      errorBorder: 'rgba(254, 202, 202, 0.7)',
      tabInactive: 'rgba(15, 23, 42, 0.42)',
      tabBarBorder: 'rgba(255, 255, 255, 0.65)',
      scrim: 'rgba(15, 23, 42, 0.42)',
      cardTitle: '#0C4A6E',
      cardBody: '#075985',
    },
    gradients: {
      screen: ['#BAE6FD', '#E0E7FF', '#F1F5F9'],
      screenLocations: [0, 0.55, 1],
      button: ['#0284C7', '#0369A1'],
      brandText: ['#EA580C', '#0369A1'],
      modal: ['#BAE6FD', '#E0E7FF', '#CFFAFE'],
      modalDanger: ['#FECACA', '#FED7AA', '#FCA5A5'],
      header: ['#BAE6FD', '#E0E7FF', '#F8FAFC'],
    },
    glass: {
      backgroundColor: 'rgba(3, 105, 161, 0.2)',
      borderColor: 'rgba(125, 211, 252, 0.5)',
      shadowColor: '#0C4A6E',
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    glassLight: {
      backgroundColor: 'rgba(248, 250, 252, 0.58)',
      borderColor: 'rgba(255, 255, 255, 0.78)',
      shadowColor: '#334155',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    glassPeach: {
      backgroundColor: 'rgba(251, 146, 60, 0.4)',
      borderColor: 'rgba(234, 88, 12, 0.4)',
      shadowColor: '#9A3412',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    tabBarBlur: 'light',
    tabBarFallback: 'rgba(248, 250, 252, 0.8)',
  },
};

/** Default palette kept as named exports for gradual migration. */
export const colors = themes.playtracker.colors;
export const gradients = themes.playtracker.gradients;
export const glass = themes.playtracker.glass;
export const glassLight = themes.playtracker.glassLight;
export const glassPeach = themes.playtracker.glassPeach;

/** Soft dark lilac used for discover / public-league accents. */
export const accentLilac = '#5B21B6';

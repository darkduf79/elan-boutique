export const colors = {
  bg: '#F4F5F9',
  surface: '#FFFFFF',
  ink: '#111827',
  inkSoft: '#4B5563',
  muted: '#8A919F',
  line: '#E8EAF0',
  primary: '#2C5BF5',
  primaryDark: '#1F49D8',
  primarySoft: '#EDF1FF',
  lavender: '#EEF1FB',
  mint: '#E9F8EF',
  mintInk: '#1D9E5C',
  amber: '#F5A623',
  amberSoft: '#FFF3E2',
  amberInk: '#B96A16',
  roseSoft: '#FDECEF',
  roseInk: '#E5484D',
  gold: '#FFB020',
} as const;

export const fonts = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
  extrabold: 'System',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  pill: 999,
} as const;

export const shadow = {
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  button: {
    shadowColor: '#2C5BF5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

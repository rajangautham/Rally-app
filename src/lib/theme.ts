import { useColorScheme } from 'react-native';

const light = {
  paper: '#F2F5F0',
  surface: '#FFFFFF',
  surface2: '#E7EDE7',
  ink: '#15241D',
  muted: '#55655C',
  line: '#D3DDD5',
  court: '#24573F',
  ball: '#D6E24A',
  ballInk: '#15241D',
  accent: '#24573F',
  support: '#3552A3',
  onSupport: '#FFFFFF',
  supportBg: '#E7ECF8',
  warn: '#8A4B00',
  warnBg: '#FCEFD9',
  danger: '#B42318',
  onDanger: '#FFFFFF',
  dangerBg: '#FCE7E4',
  scrim: 'rgba(12,24,18,0.5)',
};

export type Palette = typeof light;

const dark: Palette = {
  paper: '#101915',
  surface: '#17231D',
  surface2: '#1F2E27',
  ink: '#E6EEE9',
  muted: '#9EB2A7',
  line: '#2B3C33',
  court: '#1E4A35',
  ball: '#D6E24A',
  ballInk: '#15241D',
  accent: '#9FD8B6',
  support: '#9CB2F2',
  onSupport: '#101915',
  supportBg: '#1C2640',
  warn: '#F2B866',
  warnBg: '#332512',
  danger: '#F29A90',
  onDanger: '#101915',
  dangerBg: '#3A1D1A',
  scrim: 'rgba(0,0,0,0.6)',
};

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'AtkinsonHyperlegible_400Regular',
  bodyBold: 'AtkinsonHyperlegible_700Bold',
};

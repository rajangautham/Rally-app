export const SPORTS = [
  { key: 'badminton', name: 'Badminton', emoji: '🏸' },
  { key: 'cricket', name: 'Cricket', emoji: '🏏' },
  { key: 'football', name: 'Football', emoji: '⚽' },
  { key: 'basketball', name: 'Basketball', emoji: '🏀' },
  { key: 'volleyball', name: 'Volleyball', emoji: '🏐' },
  { key: 'tennis', name: 'Tennis', emoji: '🎾' },
  { key: 'running', name: 'Running', emoji: '🏃' },
] as const;

export type SportKey = (typeof SPORTS)[number]['key'];

export function sportByKey(key: string) {
  return SPORTS.find((s) => s.key === key) ?? SPORTS[0];
}

export const LEVELS = {
  fun: 'Just for fun',
  some: 'Some experience',
  comp: 'Competitive',
} as const;

export type LevelKey = keyof typeof LEVELS;

export const REASONS = {
  harass: 'Harassment or bullying',
  hate: 'Hate speech',
  sexual: 'Sexual or unwanted advances',
  spam: 'Spam or scam',
  underage: 'Might be under 18',
  safety: 'Safety concern at a game',
  other: 'Something else',
} as const;

export type ReasonKey = keyof typeof REASONS;

export const MOODS = [
  { value: 1, emoji: '😞', label: 'Low' },
  { value: 2, emoji: '😕', label: 'Not great' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
] as const;

export const CRISIS_LINES = [
  { name: 'Lifeline', description: 'Crisis support, 24 hours', tel: '131114', display: '13 11 14', sms: '0477131114', smsDisplay: '0477 13 11 14' },
  { name: 'Beyond Blue', description: 'Talk to a counsellor, 24 hours', tel: '1300224636', display: '1300 22 4636' },
  { name: '13YARN', description: 'Crisis support for Aboriginal and Torres Strait Islander people, 24 hours', tel: '139276', display: '13 92 76' },
  { name: 'QLife', description: 'LGBTIQ+ peer support and referral', tel: '1800184527', display: '1800 184 527' },
] as const;

export const RULES = [
  { icon: '📍', title: 'Meet in public places', body: "Games happen at parks, courts and sports centres, never at someone's home." },
  { icon: '🤝', title: 'Be kind, on and off the court', body: 'No insults, hate or pressure. Beginners are welcome at every game.' },
  { icon: '🏸', title: 'Keep it about the game', body: 'Rally is for sport and friendship, not dating or selling. Unwanted advances get accounts removed.' },
  { icon: '🚩', title: 'Report anything that feels off', body: 'A person reviews every report. One upheld report is a warning, two is a 7-day pause, three is a ban.' },
] as const;

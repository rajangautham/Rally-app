import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button, Chip, ErrorText, Field, Txt } from '@/components/ui';
import { LEVELS, SPORTS, type LevelKey, type SportKey } from '@/lib/constants';
import { errorText } from '@/lib/format';
import { looksAbusive } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

function nextDays(count: number): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
}

// 6:00 am to 10:00 pm in half-hour steps, stored as minutes after midnight.
const TIMES = Array.from({ length: 33 }, (_, i) => 360 + i * 30);

function timeLabel(minutes: number): string {
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}

export default function Host() {
  const c = useTheme();
  const { session, profile } = useAuth();
  const days = useMemo(() => nextDays(14), []);
  const [sport, setSport] = useState<SportKey>(profile?.sports[0] ?? 'badminton');
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [capacity, setCapacity] = useState(4);
  const [level, setLevel] = useState<LevelKey>('fun');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    setError(null);
    if (!title.trim() || !venue.trim() || dayIndex === null || time === null) {
      return setError('Add a game name, place, day and start time.');
    }
    const d = days[dayIndex];
    const startsAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(time / 60), time % 60);
    if (startsAt.getTime() <= Date.now() + 15 * 60000) return setError('Pick a start time at least 15 minutes from now.');
    if (looksAbusive(`${title} ${notes}`)) return setError('The game name or notes might break our ground rule on being kind. Edit them and try again.');

    setBusy(true);
    const { data, error: e } = await supabase
      .from('games')
      .insert({
        host_id: session?.user.id,
        sport,
        title: title.trim(),
        venue: venue.trim(),
        starts_at: startsAt.toISOString(),
        capacity,
        level,
        notes: notes.trim() || null,
      })
      .select('id')
      .single();
    setBusy(false);
    if (e || !data) return setError(errorText(e));
    router.replace(`/game/${data.id}`);
  }

  const dayLabel = (d: Date, i: number) =>
    i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Txt variant="label" style={{ marginBottom: 8 }}>Sport</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {SPORTS.map((s) => <Chip key={s.key} label={`${s.emoji} ${s.name}`} selected={sport === s.key} onPress={() => setSport(s.key)} />)}
        </View>
        <Field label="Game name" value={title} onChangeText={setTitle} placeholder="Casual doubles" maxLength={60} />
        <Field label="Where" value={venue} onChangeText={setVenue} placeholder="Park or sports centre" maxLength={80} hint="Pick a public place. Share the exact meeting spot in the game chat." />

        <Txt variant="label" style={{ marginBottom: 8 }}>Day</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 18 }}>
          {days.map((d, i) => <Chip key={i} label={dayLabel(d, i)} selected={dayIndex === i} onPress={() => setDayIndex(i)} />)}
        </ScrollView>
        <Txt variant="label" style={{ marginBottom: 8 }}>Start time</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 18 }}>
          {TIMES.map((t) => <Chip key={t} label={timeLabel(t)} selected={time === t} onPress={() => setTime(t)} />)}
        </ScrollView>

        <Txt variant="label" style={{ marginBottom: 8 }}>Players, including you</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Stepper label="−" accessibilityLabel="Fewer players" onPress={() => setCapacity((n) => Math.max(2, n - 1))} />
          <Txt variant="title" style={{ fontSize: 24, minWidth: 36, textAlign: 'center' }} accessibilityLiveRegion="polite">{capacity}</Txt>
          <Stepper label="+" accessibilityLabel="More players" onPress={() => setCapacity((n) => Math.min(30, n + 1))} />
        </View>

        <Txt variant="label" style={{ marginBottom: 8 }}>Level</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {(Object.keys(LEVELS) as LevelKey[]).map((k) => <Chip key={k} label={LEVELS[k]} selected={level === k} onPress={() => setLevel(k)} />)}
        </View>
        <Field label="Anything players should know? (optional)" value={notes} onChangeText={setNotes} multiline maxLength={300} />
        <ErrorText>{error}</ErrorText>
        <Button label="Post game" variant="ball" onPress={post} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stepper({ label, accessibilityLabel, onPress }: { label: string; accessibilityLabel: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: c.line, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
      <Txt variant="title" style={{ fontSize: 22, lineHeight: 26 }}>{label}</Txt>
    </Pressable>
  );
}

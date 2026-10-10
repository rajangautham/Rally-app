import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { CourtHeader } from '@/components/court';
import { GameRow } from '@/components/GameRow';
import { Button, LinkButton, Txt } from '@/components/ui';
import { MOODS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { GAME_FIELDS, toGame, type GameSummary } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function MyGames() {
  const c = useTheme();
  const { session } = useAuth();
  const uid = session?.user.id;
  const [games, setGames] = useState<GameSummary[]>([]);
  const [moods, setMoods] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!uid) return;
    const [g, m] = await Promise.all([
      supabase.from('game_players').select(`game:games(${GAME_FIELDS})`).eq('user_id', uid),
      supabase.from('moods').select('game_id, mood'),
    ]);
    if (!g.error) {
      const rows = (g.data ?? []).map((r: { game: unknown }) => (Array.isArray(r.game) ? r.game[0] : r.game)).filter(Boolean);
      setGames(rows.map((r) => toGame(r as Record<string, unknown>)));
    }
    if (!m.error) setMoods(Object.fromEntries((m.data ?? []).map((r: { game_id: string; mood: number }) => [r.game_id, r.mood])));
  }, [uid]);

  useFocusEffect(useCallback(() => void load(), [load]));

  async function saveMood(gameId: string, mood: number | null) {
    if (!uid) return;
    setMoods((cur) => {
      const next = { ...cur };
      if (mood === null) delete next[gameId];
      else next[gameId] = mood;
      return next;
    });
    if (mood === null) await supabase.from('moods').delete().eq('game_id', gameId).eq('user_id', uid);
    else await supabase.from('moods').upsert({ user_id: uid, game_id: gameId, mood });
  }

  const now = Date.now();
  const upcoming = games.filter((g) => new Date(g.starts_at).getTime() > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const played = games
    .filter((g) => new Date(g.starts_at).getTime() <= now && g.status === 'scheduled')
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <CourtHeader title="My games" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Txt variant="heading" style={{ marginHorizontal: 18, marginTop: 22, marginBottom: 4 }}>Coming up</Txt>
        {upcoming.length ? (
          upcoming.map((g) => <GameRow key={g.id} game={g} joined isHost={g.host_id === uid} />)
        ) : (
          <View style={{ padding: 18, gap: 10 }}>
            <Txt>You haven't joined a game yet.</Txt>
            <Button label="Find a game" onPress={() => router.navigate('/')} style={{ alignSelf: 'flex-start' }} />
          </View>
        )}

        <Txt variant="heading" style={{ marginHorizontal: 18, marginTop: 26, marginBottom: 4 }}>Played</Txt>
        {played.length === 0 ? (
          <Txt variant="small" style={{ paddingHorizontal: 18 }}>Games you've played show up here, so you can note how you felt afterwards.</Txt>
        ) : null}
        {played.map((g) => {
          const mood = moods[g.id];
          const picked = MOODS.find((m) => m.value === mood);
          return (
            <View key={g.id} style={{ borderBottomWidth: 1, borderBottomColor: c.line }}>
              <GameRow game={g} joined isHost={g.host_id === uid} />
              <View style={{ paddingHorizontal: 18, paddingBottom: 16, marginTop: -6 }}>
                {picked ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Txt>After this game you felt <Txt variant="bold">{picked.emoji} {picked.label}</Txt></Txt>
                    <LinkButton label="Change" onPress={() => void saveMood(g.id, null)} />
                  </View>
                ) : (
                  <>
                    <Txt variant="label">How did you feel after this game?</Txt>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                      {MOODS.map((m) => (
                        <Pressable
                          key={m.value}
                          accessibilityRole="button"
                          accessibilityLabel={m.label}
                          onPress={() => void saveMood(g.id, m.value)}
                          style={{ flex: 1, alignItems: 'center', borderWidth: 1.5, borderColor: c.line, borderRadius: 12, paddingVertical: 6, backgroundColor: c.surface }}
                        >
                          <Txt style={{ fontSize: 22, lineHeight: 28 }}>{m.emoji}</Txt>
                          <Txt variant="small" style={{ fontSize: 11, lineHeight: 14 }}>{m.label}</Txt>
                        </Pressable>
                      ))}
                    </View>
                    <Txt variant="small" style={{ marginTop: 6 }}>Only you can see this.</Txt>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

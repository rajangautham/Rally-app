import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CourtHeader } from '@/components/court';
import { GameRow } from '@/components/GameRow';
import { Banner, Button, Chip, Txt } from '@/components/ui';
import { SPORTS, sportByKey, type SportKey } from '@/lib/constants';
import { errorText } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { fonts, useTheme } from '@/lib/theme';
import { GAME_FIELDS, toGame, type GameSummary } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

type Filter = 'all' | 'mine' | SportKey;

export default function Discover() {
  const c = useTheme();
  const { session, profile, account, refresh } = useAuth();
  const uid = session?.user.id;
  const [games, setGames] = useState<GameSummary[]>([]);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    const [g, p] = await Promise.all([
      supabase
        .from('games')
        .select(GAME_FIELDS)
        .eq('status', 'scheduled')
        .gt('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(100),
      supabase.from('game_players').select('game_id').eq('user_id', uid),
    ]);
    if (g.error) setError(errorText(g.error));
    else {
      setError(null);
      setGames((g.data ?? []).map(toGame));
    }
    if (!p.error) setJoined(new Set((p.data ?? []).map((r: { game_id: string }) => r.game_id)));
    setLoading(false);
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refresh(); // picks up warnings or pauses
    }, [load, refresh]),
  );

  const visible = useMemo(() => {
    if (filter === 'all') return games;
    if (filter === 'mine') return games.filter((g) => profile?.sports.includes(g.sport));
    return games.filter((g) => g.sport === filter);
  }, [games, filter, profile]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'mine', label: 'My sports' },
    ...SPORTS.map((s) => ({ key: s.key as Filter, label: `${s.emoji} ${s.name}` })),
  ];
  const emptyLabel = filter === 'all' ? 'games' : filter === 'mine' ? 'games in your sports' : `${sportByKey(filter).name.toLowerCase()} games`;

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <CourtHeader title={`Games near ${profile?.suburb ?? 'you'}`} subtitle={`Hi ${profile?.first_name ?? ''}. Pick a game, turn up, meet people.`} />
      <FlatList
        data={visible}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GameRow game={item} joined={joined.has(item.id)} isHost={item.host_id === uid} />}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListHeaderComponent={
          <>
            {account?.strikes === 1 ? (
              <Banner tone="warn" style={{ marginHorizontal: 18, marginTop: 14 }}>
                You have 1 warning. Another upheld report pauses your account for 7 days.
              </Banner>
            ) : null}
            {error ? <Banner tone="danger" style={{ marginHorizontal: 18, marginTop: 14 }}>{error}</Banner> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {filters.map((f) => (
                <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
              ))}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={{ padding: 22, gap: 8 }}>
              <Txt variant="bold">No {emptyLabel} coming up.</Txt>
              <Txt variant="small">Host one and players nearby will see it.</Txt>
              <Button label="Host a game" onPress={() => router.push('/host')} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
            </View>
          )
        }
      />
      <Pressable accessibilityRole="button" onPress={() => router.push('/host')} style={[styles.fab, { backgroundColor: c.ball }]}>
        <Ionicons name="add" size={20} color={c.ballInk} />
        <Txt style={{ fontFamily: fonts.bodyBold, color: c.ballInk }}>Host a game</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 13,
    shadowColor: '#14281E',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
});

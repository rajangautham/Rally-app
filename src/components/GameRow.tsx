import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CourtLines } from '@/components/court';
import { Tag, Txt } from '@/components/ui';
import { LEVELS, sportByKey } from '@/lib/constants';
import { formatWhen } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { GameSummary } from '@/lib/types';

export function SportTile({ sport, size = 52 }: { sport: string; size?: number }) {
  const c = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: c.court, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <CourtLines opacity={0.35} portrait />
      <Txt style={{ fontSize: size * 0.48, lineHeight: size * 0.62 }}>{sportByKey(sport).emoji}</Txt>
    </View>
  );
}

function Dots({ filled, total }: { filled: number; total: number }) {
  const c = useTheme();
  const shown = Math.min(total, 12);
  const on = total > 12 ? Math.round((filled / total) * 12) : filled;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }} accessible={false}>
      {Array.from({ length: shown }, (_, i) => (
        <View
          key={i}
          style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: c.accent, backgroundColor: i < on ? c.accent : 'transparent' }}
        />
      ))}
    </View>
  );
}

export function GameRow({ game, joined, isHost }: { game: GameSummary; joined?: boolean; isHost?: boolean }) {
  const c = useTheme();
  const when = formatWhen(game.starts_at);
  const left = game.capacity - game.player_count;
  const spots = game.status === 'cancelled' ? 'Cancelled' : left > 0 ? `${left} spot${left > 1 ? 's' : ''} left` : 'Full';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sportByKey(game.sport).name}: ${game.title}. ${when.day}, ${when.time}. ${game.venue}. ${spots}.`}
      onPress={() => router.push(`/game/${game.id}`)}
      style={({ pressed }) => [styles.row, { borderBottomColor: c.line, backgroundColor: pressed ? c.surface2 : 'transparent' }]}
    >
      <SportTile sport={game.sport} />
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="label" color={c.accent} style={{ fontSize: 14 }}>
          {when.day}, {when.time}
        </Txt>
        <Txt variant="bold" style={{ fontSize: 17 }}>{game.title}</Txt>
        <Txt variant="small">{game.venue}</Txt>
        <View style={styles.foot}>
          <Dots filled={game.player_count} total={game.capacity} />
          <Txt variant="small" style={{ fontSize: 13 }}>{spots}</Txt>
          <Tag label={LEVELS[game.level]} />
          {isHost ? <Tag label="Hosting" highlight /> : joined ? <Tag label="Joined" highlight /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, alignItems: 'flex-start' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 },
});

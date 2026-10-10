import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { CourtHeader } from '@/components/court';
import { Button, Tag, Txt } from '@/components/ui';
import { LEVELS, sportByKey } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

type Blocked = { blocked_id: string; name: string };

export default function Profile() {
  const c = useTheme();
  const { session, profile, account, signOut } = useAuth();
  const [blocked, setBlocked] = useState<Blocked[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('blocks').select('blocked_id, blocked:profiles!blocks_blocked_id_fkey(first_name)');
    setBlocked(
      (data ?? []).map((r: { blocked_id: string; blocked: unknown }) => {
        const p = (Array.isArray(r.blocked) ? r.blocked[0] : r.blocked) as { first_name?: string } | null;
        return { blocked_id: r.blocked_id, name: p?.first_name ?? 'Someone' };
      }),
    );
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  async function unblock(id: string) {
    if (!session) return;
    await supabase.from('blocks').delete().eq('blocker_id', session.user.id).eq('blocked_id', id);
    void load();
  }

  if (!profile || !account) return null;
  const standing = account.strikes === 0 ? 'Good standing' : `${account.strikes} of 3 strikes`;

  const MenuItem = ({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: pressed ? c.surface2 : 'transparent' })}
    >
      <Txt color={danger ? c.danger : c.ink}>{label}</Txt>
      {!danger ? <Ionicons name="chevron-forward" size={18} color={c.muted} /> : null}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <CourtHeader title="Profile" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ padding: 18 }}>
          <Txt variant="title" style={{ fontSize: 30, lineHeight: 34 }}>{profile.first_name}</Txt>
          <Txt variant="small" style={{ marginTop: 2 }}>{profile.suburb}. {LEVELS[profile.level]}.</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {profile.sports.map((s) => <Tag key={s} label={`${sportByKey(s).emoji} ${sportByKey(s).name}`} />)}
          </View>
        </View>
        <View style={{ paddingHorizontal: 18, flexDirection: 'row', gap: 16 }}>
          <Txt variant="small">Account</Txt>
          <Txt variant="bold">{standing}</Txt>
        </View>

        <Txt variant="heading" style={{ marginHorizontal: 18, marginTop: 26, marginBottom: 6 }}>Blocked players</Txt>
        {blocked.length === 0 ? (
          <Txt variant="small" style={{ paddingHorizontal: 18 }}>You haven't blocked anyone.</Txt>
        ) : (
          blocked.map((b) => (
            <View key={b.blocked_id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Txt>{b.name}</Txt>
              <Button label="Unblock" variant="ghost" small onPress={() => void unblock(b.blocked_id)} />
            </View>
          ))
        )}

        <Txt variant="heading" style={{ marginHorizontal: 18, marginTop: 26, marginBottom: 6 }}>More</Txt>
        <MenuItem label="Ground rules" onPress={() => router.push('/guidelines')} />
        {account.is_moderator ? <MenuItem label="Moderation queue" onPress={() => router.push('/moderation')} /> : null}
        <MenuItem label="Sign out" danger onPress={() => void signOut()} />
      </ScrollView>
    </View>
  );
}

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Banner, Button, LinkButton, Quote, Tag, Txt } from '@/components/ui';
import { REASONS } from '@/lib/constants';
import { errorText } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { REPORT_FIELDS, toReport, type ModReport } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

type Action = 'uphold' | 'dismiss' | 'ban' | 'lock';

export default function Moderation() {
  const c = useTheme();
  const { account, session, refresh } = useAuth();
  const [reports, setReports] = useState<ModReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('reports').select(REPORT_FIELDS).order('created_at', { ascending: false }).limit(100);
    if (e) setError(errorText(e));
    else setReports((data ?? []).map(toReport));
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  async function act(id: string, action: Action) {
    setError(null);
    setBusyId(id);
    const { error: e } = await supabase.rpc('moderate_report', { p_report: id, p_action: action });
    setBusyId(null);
    if (e) setError(errorText(e));
    await load();
    await refresh();
  }

  if (!account?.is_moderator) {
    return <Txt style={{ padding: 22 }}>Only moderators can see this.</Txt>;
  }

  const open = reports.filter((r) => r.status === 'open');
  const done = reports.filter((r) => r.status !== 'open');

  const upholdLabel = (strikes: number) =>
    strikes + 1 >= 3 ? 'Uphold and ban' : strikes + 1 === 2 ? 'Uphold and pause 7 days' : 'Uphold and warn';

  const Card = ({ r }: { r: ModReport }) => (
    <View style={{ marginHorizontal: 18, marginBottom: 12, borderWidth: 1.5, borderColor: c.line, borderRadius: 14, padding: 14, backgroundColor: c.surface }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="bold">{r.target_id === session?.user.id ? 'You' : r.target_name}</Txt>
        <Tag label={`${r.target_strikes} strike${r.target_strikes === 1 ? '' : 's'}`} />
      </View>
      <Txt variant="label" style={{ marginTop: 4 }}>
        {REASONS[r.reason]}
        {r.game_title ? ` in “${r.game_title}”` : ''}
      </Txt>
      {r.message_snapshot ? <Quote>{r.message_snapshot}</Quote> : null}
      {r.note ? <Txt variant="small">Reporter's note: {r.note}</Txt> : null}
      <Txt variant="small">Reported by {r.source === 'auto' ? 'the language filter' : r.reporter_name ?? 'a player'}</Txt>
      {r.status === 'open' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
          {r.reason === 'underage' ? (
            <Button small label="Lock until age check" loading={busyId === r.id} onPress={() => void act(r.id, 'lock')} />
          ) : (
            <Button small label={upholdLabel(r.target_strikes)} loading={busyId === r.id} onPress={() => void act(r.id, 'uphold')} />
          )}
          <Button small variant="ghost" label="Dismiss" onPress={() => void act(r.id, 'dismiss')} />
          <LinkButton danger label="Ban now" onPress={() => void act(r.id, 'ban')} />
        </View>
      ) : (
        <Txt variant="bold" color={c.accent} style={{ marginTop: 10 }}>{r.outcome}</Txt>
      )}
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: c.paper }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ padding: 18 }}>
        <Txt>Every report goes to a person. Each upheld report adds a strike: the first is a warning, the second a 7-day pause, the third a ban. Serious harm is an immediate ban.</Txt>
      </View>
      {error ? <Banner tone="danger" style={{ marginHorizontal: 18, marginBottom: 12 }}>{error}</Banner> : null}
      <Txt variant="heading" style={{ marginHorizontal: 18, marginBottom: 10 }}>Open ({open.length})</Txt>
      {open.length ? open.map((r) => <Card key={r.id} r={r} />) : <Txt variant="small" style={{ marginHorizontal: 18 }}>Nothing to review.</Txt>}
      {done.length ? <Txt variant="heading" style={{ marginHorizontal: 18, marginTop: 20, marginBottom: 10 }}>Resolved</Txt> : null}
      {done.map((r) => <Card key={r.id} r={r} />)}
    </ScrollView>
  );
}

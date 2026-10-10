import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';

import { Button, ErrorText, Field, Txt } from '@/components/ui';
import { REASONS, type ReasonKey } from '@/lib/constants';
import { errorText } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function Report() {
  const c = useTheme();
  const { session } = useAuth();
  const { userId, name, gameId, messageId } = useLocalSearchParams<{ userId: string; name?: string; gameId?: string; messageId?: string }>();
  const who = name ?? 'this player';
  const [reason, setReason] = useState<ReasonKey | null>(null);
  const [note, setNote] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!reason) return setError('Choose a reason.');
    setError(null);
    setBusy(true);
    const { error: e } = await supabase.from('reports').insert({
      source: 'user',
      reporter_id: session?.user.id,
      target_id: userId,
      game_id: gameId ?? null,
      message_id: messageId ? Number(messageId) : null,
      reason,
      note: note.trim() || null,
    });
    if (!e && alsoBlock) {
      await supabase.from('blocks').upsert({ blocker_id: session?.user.id, blocked_id: userId });
    }
    setBusy(false);
    if (e) return setError(errorText(e));
    setSent(true);
  }

  if (sent) {
    return (
      <View style={{ flex: 1, padding: 22, backgroundColor: c.paper }}>
        <Txt variant="title">Report sent</Txt>
        <Txt style={{ marginTop: 10 }}>
          A moderator will review it, usually within 24 hours. {alsoBlock ? `You've also blocked ${who}.` : ''}
        </Txt>
        <Txt variant="small" style={{ marginTop: 10 }}>If someone is in danger right now, call 000.</Txt>
        <Button label="Done" onPress={() => (alsoBlock ? router.dismissAll() : router.back())} style={{ marginTop: 22 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Txt variant="title" style={{ fontSize: 24 }}>Report {who}</Txt>
        <Txt variant="small" style={{ marginTop: 6, marginBottom: 16, fontSize: 15 }}>
          {messageId ? "What's wrong with this message?" : 'What happened?'} {who} won't know who reported them.
        </Txt>
        <View accessibilityRole="radiogroup" style={{ gap: 8, marginBottom: 18 }}>
          {(Object.keys(REASONS) as ReasonKey[]).map((k) => (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ checked: reason === k }}
              onPress={() => setReason(k)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: reason === k ? c.accent : c.line, borderRadius: 12, padding: 12, backgroundColor: c.surface }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                {reason === k ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent }} /> : null}
              </View>
              <Txt>{REASONS[k]}</Txt>
            </Pressable>
          ))}
        </View>
        <Field label="Anything else? (optional)" value={note} onChangeText={setNote} multiline maxLength={500} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <Txt variant="bold" style={{ flex: 1 }}>Also block {who}</Txt>
          <Switch value={alsoBlock} onValueChange={setAlsoBlock} accessibilityLabel={`Also block ${who}`} />
        </View>
        <ErrorText>{error}</ErrorText>
        <Button label="Send report" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

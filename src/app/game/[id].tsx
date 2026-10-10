import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourtLines } from '@/components/court';
import { Actions, Banner, Button, LinkButton, Quote, Sheet, Txt } from '@/components/ui';
import { LEVELS, sportByKey } from '@/lib/constants';
import { errorText, formatFullDate } from '@/lib/format';
import { looksAbusive, soundsLikeDistress } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import { fonts, useTheme } from '@/lib/theme';
import { GAME_FIELDS, MESSAGE_FIELDS, toGame, toMessage, type ChatMessage, type GameSummary, type Player } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

type SheetState =
  | { kind: 'none' }
  | { kind: 'pause'; text: string }
  | { kind: 'distress'; text: string }
  | { kind: 'message'; message: ChatMessage }
  | { kind: 'block'; userId: string; name: string }
  | { kind: 'cancel' };

export default function GameScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';

  const [game, setGame] = useState<GameSummary | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });
  const scrollRef = useRef<ScrollView>(null);

  const isMember = players.some((p) => p.user_id === uid);
  const isHost = game?.host_id === uid;

  const loadGame = useCallback(async () => {
    const [g, p, b] = await Promise.all([
      supabase.from('games').select(GAME_FIELDS).eq('id', id).maybeSingle(),
      supabase.from('game_players').select('user_id, player:profiles!game_players_user_id_fkey(first_name)').eq('game_id', id).order('joined_at'),
      supabase.from('blocks').select('blocked_id'),
    ]);
    if (!g.data) {
      setMissing(true);
      return;
    }
    setGame(toGame(g.data));
    setPlayers(
      (p.data ?? []).map((r: { user_id: string; player: unknown }) => {
        const pr = (Array.isArray(r.player) ? r.player[0] : r.player) as { first_name?: string } | null;
        return { user_id: r.user_id, first_name: pr?.first_name ?? 'Someone' };
      }),
    );
    setBlocked(new Set((b.data ?? []).map((r: { blocked_id: string }) => r.blocked_id)));
  }, [id]);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase.from('messages').select(MESSAGE_FIELDS).eq('game_id', id).order('created_at').limit(300);
    setMessages((data ?? []).map(toMessage));
  }, [id]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  // Live chat. Row-level security decides which changes this user receives.
  useEffect(() => {
    if (!isMember) return;
    void loadMessages();
    const channel = supabase
      .channel(`game-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `game_id=eq.${id}` }, () => {
        void loadMessages();
        void loadGame();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, isMember, loadMessages, loadGame]);

  async function rpc(fn: 'join_game' | 'leave_game' | 'cancel_game') {
    setError(null);
    setBusy(true);
    const { error: e } = await supabase.rpc(fn, { p_game: id });
    setBusy(false);
    if (e) setError(errorText(e));
    await loadGame();
  }

  function trySend() {
    const text = draft.trim();
    if (!text) return;
    if (soundsLikeDistress(text)) return setSheet({ kind: 'distress', text });
    if (looksAbusive(text)) return setSheet({ kind: 'pause', text });
    void send(text);
  }

  async function send(text: string) {
    setSheet({ kind: 'none' });
    const { error: e } = await supabase.from('messages').insert({ game_id: id, sender_id: uid, body: text });
    if (e) {
      setError(errorText(e));
      return;
    }
    setDraft('');
    await loadMessages();
  }

  async function block(userId: string) {
    setSheet({ kind: 'none' });
    await supabase.from('blocks').upsert({ blocker_id: uid, blocked_id: userId });
    if (game?.host_id === userId) {
      router.back();
      return;
    }
    await Promise.all([loadGame(), loadMessages()]);
  }

  function openReport(userId: string, name: string, messageId?: number) {
    setSheet({ kind: 'none' });
    router.push({ pathname: '/report', params: { userId, name, gameId: id, ...(messageId ? { messageId: String(messageId) } : {}) } });
  }

  if (missing) {
    return (
      <View style={{ flex: 1, padding: 22, backgroundColor: c.paper }}>
        <Txt variant="bold">This game isn't available any more.</Txt>
      </View>
    );
  }
  if (!game) return <View style={{ flex: 1, backgroundColor: c.paper }} />;

  const sport = sportByKey(game.sport);
  const past = new Date(game.starts_at).getTime() <= Date.now();
  const full = game.player_count >= game.capacity;
  const cancelled = game.status === 'cancelled';
  const visiblePlayers = players.filter((p) => p.user_id === uid || !blocked.has(p.user_id));

  let action = null;
  if (cancelled) action = <Banner tone="warn">This game was cancelled.</Banner>;
  else if (past) action = <Txt variant="small">This game has finished.</Txt>;
  else if (isHost) action = <Button label="Cancel this game" variant="ghost" onPress={() => setSheet({ kind: 'cancel' })} />;
  else if (isMember) action = <Button label="Leave game" variant="ghost" loading={busy} onPress={() => void rpc('leave_game')} />;
  else if (full) action = <Button label="Game is full" disabled onPress={() => {}} />;
  else action = <Button label="Join game" variant="ball" loading={busy} onPress={() => void rpc('join_game')} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 44}>
      <Stack.Screen options={{ title: sport.name }} />
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 24 }} onContentSizeChange={() => isMember && scrollRef.current?.scrollToEnd({ animated: false })}>
        <View style={[styles.hero, { backgroundColor: c.court }]}>
          <CourtLines />
          <Txt style={{ fontSize: 38, lineHeight: 46 }}>{sport.emoji}</Txt>
          <Txt style={{ color: '#FFFFFF', fontFamily: fonts.display, fontSize: 26, lineHeight: 30, marginTop: 4 }} accessibilityRole="header">
            {game.title}
          </Txt>
        </View>

        <View style={styles.facts}>
          {[
            ['When', formatFullDate(game.starts_at)],
            ['Where', game.venue],
            ['Level', LEVELS[game.level]],
            ['Host', isHost ? 'You' : game.host_name],
            ['Spots', full ? 'Full' : `${game.capacity - game.player_count} of ${game.capacity} left`],
          ].map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', gap: 16 }}>
              <Txt variant="small" style={{ width: 52, fontSize: 15 }}>{k}</Txt>
              <Txt variant="bold" style={{ flex: 1 }}>{v}</Txt>
            </View>
          ))}
        </View>
        {game.notes ? <Txt style={{ marginHorizontal: 18, marginTop: 14 }}>{game.notes}</Txt> : null}

        <Txt variant="heading" style={{ marginHorizontal: 18, marginTop: 22, fontSize: 17 }}>Who's going</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: 18, marginTop: 10 }}>
          {visiblePlayers.map((p) => (
            <View key={p.user_id} style={[styles.player, { backgroundColor: c.surface, borderColor: c.line }]}>
              <View style={[styles.avatar, { backgroundColor: c.surface2 }]}>
                <Txt variant="label" style={{ fontSize: 12 }}>{p.first_name.charAt(0)}</Txt>
              </View>
              <Txt variant="small" color={c.ink}>{p.user_id === uid ? 'You' : p.first_name}</Txt>
            </View>
          ))}
        </View>

        <View style={{ marginHorizontal: 18, marginTop: 20, gap: 10 }}>
          {error ? <Banner tone="danger">{error}</Banner> : null}
          {action}
        </View>

        <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface }}>
          <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 }}>
            <Txt variant="heading" style={{ fontSize: 17 }}>Game chat</Txt>
            {isMember ? <Txt variant="small">Tap a message to report or block</Txt> : null}
          </View>
          {!isMember ? (
            <Txt variant="small" style={{ paddingHorizontal: 18, paddingBottom: 20, paddingTop: 6 }}>
              Join the game to chat with players and get the exact meeting spot.
            </Txt>
          ) : (
            <View style={{ padding: 14, gap: 8 }}>
              {messages.map((m) => (
                <MessageBubble key={m.id} m={m} mine={m.sender_id === uid} onPress={() => setSheet({ kind: 'message', message: m })} />
              ))}
            </View>
          )}
        </View>

        {!isHost ? (
          <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
            <LinkButton label="Report this game or its host" onPress={() => openReport(game.host_id, game.host_name)} />
          </View>
        ) : null}
      </ScrollView>

      {isMember && !cancelled ? (
        <View style={[styles.composer, { borderTopColor: c.line, backgroundColor: c.surface, paddingBottom: 10 + insets.bottom }]}>
          <TextInput
            accessibilityLabel="Message the group"
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the group"
            placeholderTextColor={c.muted}
            maxLength={500}
            onSubmitEditing={trySend}
            returnKeyType="send"
            style={[styles.input, { borderColor: c.line, backgroundColor: c.paper, color: c.ink }]}
          />
          <Button label="Send" small onPress={trySend} />
        </View>
      ) : null}

      {/* Sheets */}
      <Sheet visible={sheet.kind === 'pause'} title="Pause before sending" onClose={() => setSheet({ kind: 'none' })}>
        <Txt>This message might break our ground rule on being kind. Upheld reports lead to a warning, then a 7-day pause, then a ban.</Txt>
        {sheet.kind === 'pause' ? <Quote>{sheet.text}</Quote> : null}
        <Actions>
          <Button label="Edit message" onPress={() => setSheet({ kind: 'none' })} />
          <Button label="Send anyway" variant="ghost" onPress={() => sheet.kind === 'pause' && void send(sheet.text)} />
        </Actions>
      </Sheet>

      <Sheet visible={sheet.kind === 'distress'} title="Before you send" onClose={() => setSheet({ kind: 'none' })}>
        <Txt>It sounds like things might be really heavy right now. You don't have to carry that on your own.</Txt>
        <Actions>
          <Button label="Call Lifeline 13 11 14" variant="support" onPress={() => void Linking.openURL('tel:131114')} />
          <Button label="Text Lifeline 0477 13 11 14" variant="ghost" onPress={() => void Linking.openURL('sms:0477131114')} />
          <Button label="See all support options" variant="ghost" onPress={() => { setSheet({ kind: 'none' }); router.navigate('/support'); }} />
        </Actions>
        <Txt variant="small" style={{ marginTop: 16 }}>
          Your message will be seen by everyone in this game chat. They'll care, but they aren't trained to help in a crisis.
        </Txt>
        <Actions>
          <Button label="Send my message" onPress={() => sheet.kind === 'distress' && void send(sheet.text)} />
        </Actions>
      </Sheet>

      <Sheet
        visible={sheet.kind === 'message'}
        title={sheet.kind === 'message' ? `${sheet.message.sender_name ?? 'Someone'}'s message` : ''}
        onClose={() => setSheet({ kind: 'none' })}
      >
        {sheet.kind === 'message' && sheet.message.body ? <Quote>{sheet.message.body}</Quote> : null}
        {sheet.kind === 'message' && sheet.message.sender_id ? (
          <Actions>
            <Button
              label="Report message"
              onPress={() => sheet.message.sender_id && openReport(sheet.message.sender_id, sheet.message.sender_name ?? 'Someone', sheet.message.id)}
            />
            <Button
              label={`Block ${sheet.message.sender_name ?? 'them'}`}
              variant="ghost"
              onPress={() =>
                sheet.message.sender_id &&
                setSheet({ kind: 'block', userId: sheet.message.sender_id, name: sheet.message.sender_name ?? 'them' })
              }
            />
          </Actions>
        ) : null}
      </Sheet>

      <Sheet visible={sheet.kind === 'block'} title={sheet.kind === 'block' ? `Block ${sheet.name}?` : ''} onClose={() => setSheet({ kind: 'none' })}>
        <Txt>You won't see each other's games or messages. {sheet.kind === 'block' ? sheet.name : 'They'} isn't told.</Txt>
        <Actions>
          <Button label={sheet.kind === 'block' ? `Block ${sheet.name}` : 'Block'} variant="danger" onPress={() => sheet.kind === 'block' && void block(sheet.userId)} />
        </Actions>
      </Sheet>

      <Sheet visible={sheet.kind === 'cancel'} title="Cancel this game?" onClose={() => setSheet({ kind: 'none' })}>
        <Txt>Everyone who joined will see that it's off.</Txt>
        <Actions>
          <Button label="Cancel game" variant="danger" onPress={() => { setSheet({ kind: 'none' }); void rpc('cancel_game'); }} />
          <Button label="Keep game" variant="ghost" onPress={() => setSheet({ kind: 'none' })} />
        </Actions>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ m, mine, onPress }: { m: ChatMessage; mine: boolean; onPress: () => void }) {
  const c = useTheme();
  if (m.kind === 'system') {
    return <Txt variant="small" style={{ alignSelf: 'center', textAlign: 'center', fontSize: 13 }}>{m.body}</Txt>;
  }
  if (m.removed || !m.body) {
    return <Txt variant="small" style={{ fontStyle: 'italic' }}>Message removed by moderators</Txt>;
  }
  if (mine) {
    return (
      <View style={[styles.bubble, { alignSelf: 'flex-end', backgroundColor: c.court, borderBottomRightRadius: 4 }]}>
        <Txt color="#FFFFFF" style={{ fontSize: 15, lineHeight: 21 }}>{m.body}</Txt>
        {m.flagged ? <Txt color="rgba(255,255,255,0.8)" style={{ fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>Flagged for review</Txt> : null}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens options to report or block"
      onPress={onPress}
      style={[styles.bubble, { alignSelf: 'flex-start', backgroundColor: c.surface2, borderBottomLeftRadius: 4 }]}
    >
      <Txt variant="label" color={c.accent} style={{ fontSize: 12 }}>{m.sender_name ?? 'Someone'}</Txt>
      <Txt style={{ fontSize: 15, lineHeight: 21 }}>{m.body}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { marginHorizontal: 18, marginTop: 8, borderRadius: 22, padding: 20, overflow: 'hidden' },
  facts: { marginHorizontal: 18, marginTop: 18, gap: 8 },
  player: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingLeft: 4, paddingRight: 11 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '84%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  composer: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.body, fontSize: 16 },
});

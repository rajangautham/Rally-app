import type { LevelKey, ReasonKey, SportKey } from './constants';

export type Profile = {
  id: string;
  first_name: string;
  suburb: string;
  sports: SportKey[];
  level: LevelKey;
};

export type AccountStatus = 'active' | 'suspended' | 'banned' | 'locked';

export type Account = {
  user_id: string;
  strikes: number;
  status: AccountStatus;
  suspended_until: string | null;
  is_moderator: boolean;
};

export type Settings = {
  allowed_email_domains: string[];
  require_phone: boolean;
  min_age: number;
};

export type GameSummary = {
  id: string;
  sport: SportKey;
  title: string;
  venue: string;
  starts_at: string;
  capacity: number;
  level: LevelKey;
  notes: string | null;
  status: 'scheduled' | 'cancelled';
  host_id: string;
  host_name: string;
  player_count: number;
};

export type Player = { user_id: string; first_name: string };

export type ChatMessage = {
  id: number;
  sender_id: string | null;
  sender_name: string | null;
  kind: 'user' | 'system';
  body: string | null;
  flagged: boolean;
  removed: boolean;
  created_at: string;
};

export type ModReport = {
  id: string;
  source: 'user' | 'auto';
  reason: ReasonKey;
  note: string | null;
  status: 'open' | 'dismissed' | 'upheld';
  outcome: string | null;
  message_snapshot: string | null;
  created_at: string;
  target_id: string;
  target_name: string;
  target_strikes: number;
  reporter_name: string | null;
  game_title: string | null;
};

// Same rule as private.is_active() in the database. The database is the real check;
// this only decides which screens to show.
export function isAccountActive(a: Account | null): boolean {
  if (!a) return false;
  if (a.status === 'active') return true;
  return a.status === 'suspended' && !!a.suspended_until && new Date(a.suspended_until) <= new Date();
}

// ---------------------------------------------------------------------------
// Mapping Supabase results. PostgREST returns embedded rows as an object or a
// one-item array depending on the relationship, so `one()` accepts both.
// ---------------------------------------------------------------------------
type Row = { [key: string]: any };

function one(value: unknown): Row | null {
  if (Array.isArray(value)) return (value[0] as Row) ?? null;
  return (value as Row) ?? null;
}

export const GAME_FIELDS =
  'id, sport, title, venue, starts_at, capacity, level, notes, status, host_id, host:profiles!games_host_id_fkey(first_name), game_players(count)';

export function toGame(r: Row): GameSummary {
  return {
    id: r.id,
    sport: r.sport,
    title: r.title,
    venue: r.venue,
    starts_at: r.starts_at,
    capacity: r.capacity,
    level: r.level,
    notes: r.notes ?? null,
    status: r.status,
    host_id: r.host_id,
    host_name: one(r.host)?.first_name ?? 'Someone',
    player_count: one(r.game_players)?.count ?? 0,
  };
}

export const MESSAGE_FIELDS =
  'id, sender_id, kind, body, flagged, removed, created_at, sender:profiles!messages_sender_id_fkey(first_name)';

export function toMessage(r: Row): ChatMessage {
  return {
    id: r.id,
    sender_id: r.sender_id ?? null,
    sender_name: one(r.sender)?.first_name ?? null,
    kind: r.kind,
    body: r.body ?? null,
    flagged: !!r.flagged,
    removed: !!r.removed,
    created_at: r.created_at,
  };
}

export const REPORT_FIELDS =
  'id, source, reason, note, status, outcome, message_snapshot, created_at, target_id, ' +
  'target:profiles!reports_target_id_fkey(first_name, account:accounts(strikes)), ' +
  'reporter:profiles!reports_reporter_id_fkey(first_name), game:games(title)';

export function toReport(r: Row): ModReport {
  const target = one(r.target);
  return {
    id: r.id,
    source: r.source,
    reason: r.reason,
    note: r.note ?? null,
    status: r.status,
    outcome: r.outcome ?? null,
    message_snapshot: r.message_snapshot ?? null,
    created_at: r.created_at,
    target_id: r.target_id,
    target_name: target?.first_name ?? 'Unknown',
    target_strikes: one(target?.account)?.strikes ?? 0,
    reporter_name: one(r.reporter)?.first_name ?? null,
    game_title: one(r.game)?.title ?? null,
  };
}

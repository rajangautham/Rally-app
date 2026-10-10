-- Rally MVP schema
-- Every safety rule lives here, in the database, so it holds even if someone
-- modifies the app. The app's own checks are for user experience only.

create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Settings (single row, editable from the Supabase table editor)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true check (id),
  allowed_email_domains text[] not null default array['ad.unsw.edu.au', 'student.unsw.edu.au'],
  require_phone boolean not null default true,
  min_age int not null default 18 check (min_age >= 18)
);
insert into public.app_settings default values;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create function private.valid_sports() returns text[]
language sql immutable set search_path = '' as $$
  select array['badminton', 'cricket', 'football', 'basketball', 'volleyball', 'tennis', 'running']
$$;

-- What other players can see.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 30),
  suburb text not null check (char_length(btrim(suburb)) between 1 and 40),
  sports text[] not null check (cardinality(sports) between 1 and 7 and sports <@ private.valid_sports()),
  level text not null check (level in ('fun', 'some', 'comp')),
  created_at timestamptz not null default now()
);

-- What only the owner (and moderators) can see.
create table public.accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  dob date not null,
  rules_accepted_at timestamptz not null,
  strikes int not null default 0 check (strikes >= 0),
  status text not null default 'active' check (status in ('active', 'suspended', 'banned', 'locked')),
  suspended_until timestamptz,
  is_moderator boolean not null default false,
  created_at timestamptz not null default now()
);

-- Accounts that entered an under-age date of birth. They can't retry with a new one.
create table private.age_gate_rejections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  sport text not null check (sport = any (private.valid_sports())),
  title text not null check (char_length(btrim(title)) between 1 and 60),
  venue text not null check (char_length(btrim(venue)) between 1 and 80),
  starts_at timestamptz not null,
  capacity int not null check (capacity between 2 and 30),
  level text not null check (level in ('fun', 'some', 'comp')),
  notes text check (notes is null or char_length(notes) <= 300),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now()
);
create index games_upcoming_idx on public.games (starts_at) where status = 'scheduled';

create table public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index game_players_user_idx on public.game_players (user_id);

create table public.messages (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  kind text not null default 'user' check (kind in ('user', 'system')),
  body text check (body is null or char_length(body) between 1 and 500),
  flagged boolean not null default false,
  removed boolean not null default false,
  created_at timestamptz not null default now(),
  check (removed or body is not null)
);
create index messages_game_idx on public.messages (game_id, created_at);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'user' check (source in ('user', 'auto')),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid references public.games (id) on delete set null,
  message_id bigint references public.messages (id) on delete set null,
  message_snapshot text,
  reason text not null check (reason in ('harass', 'hate', 'sexual', 'spam', 'underage', 'safety', 'other')),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'dismissed', 'upheld')),
  outcome text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_open_idx on public.reports (created_at) where status = 'open';

create table public.moods (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  mood smallint not null check (mood between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- ---------------------------------------------------------------------------
-- Helpers used by policies. They live in `private`, which the API doesn't
-- expose, so nobody can call them directly (for example to check who blocked whom).
-- ---------------------------------------------------------------------------
create function private.is_active(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.accounts a
    where a.user_id = uid
      and (a.status = 'active' or (a.status = 'suspended' and a.suspended_until <= now()))
  );
$$;

create function private.is_moderator(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select a.is_moderator from public.accounts a where a.user_id = uid), false);
$$;

create function private.is_game_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.game_players p where p.game_id = gid and p.user_id = auth.uid());
$$;

create function private.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b) or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

-- Prototype word list. v1 replaces this with a context-aware model in an Edge Function.
create function private.is_abusive(body text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(body, '') ~* '\y(idiots?|stupid|losers?|dumb|pathetic|kys)\y|\yshut up\y|\yhate you\y|\ykill yourself\y';
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function private.games_add_host() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.game_players (game_id, user_id) values (new.id, new.host_id);
  return new;
end $$;
create trigger games_add_host after insert on public.games
  for each row execute function private.games_add_host();

create function private.messages_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  new.removed := false;
  new.flagged := new.kind = 'user' and private.is_abusive(new.body);
  return new;
end $$;
create trigger messages_before_insert before insert on public.messages
  for each row execute function private.messages_before_insert();

-- A flagged message goes to the moderation queue. A person decides the outcome.
create function private.messages_flag_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.flagged then
    insert into public.reports (source, target_id, game_id, message_id, message_snapshot, reason)
    values ('auto', new.sender_id, new.game_id, new.id, new.body, 'harass');
  end if;
  return null;
end $$;
create trigger messages_flag_report after insert on public.messages
  for each row execute function private.messages_flag_report();

-- Never trust the client for who is being reported or what the message said.
create function private.reports_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m public.messages%rowtype;
begin
  new.status := 'open';
  new.outcome := null;
  new.resolved_by := null;
  new.resolved_at := null;
  new.created_at := now();
  if new.source = 'user' then
    new.reporter_id := auth.uid();
    if new.message_id is not null then
      select * into m from public.messages where id = new.message_id;
      if not found or m.kind <> 'user' or m.sender_id is null then
        raise exception 'That message can''t be reported.';
      end if;
      if not exists (select 1 from public.game_players p where p.game_id = m.game_id and p.user_id = new.reporter_id) then
        raise exception 'You can only report messages in your own games.';
      end if;
      new.target_id := m.sender_id;
      new.game_id := m.game_id;
      new.message_snapshot := m.body;
    else
      new.message_snapshot := null;
    end if;
    if new.target_id = new.reporter_id then
      raise exception 'You can''t report yourself.';
    end if;
  end if;
  return new;
end $$;
create trigger reports_before_insert before insert on public.reports
  for each row execute function private.reports_before_insert();

-- ---------------------------------------------------------------------------
-- Functions the app calls (RPC)
-- ---------------------------------------------------------------------------

-- Step 1 of onboarding. Records under-age attempts so a new date can't be tried.
create function public.check_age(p_dob date) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_min int;
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
  if exists (select 1 from private.age_gate_rejections r where r.user_id = v_uid) then
    return false;
  end if;
  select s.min_age into v_min from public.app_settings s where s.id;
  if p_dob is null or p_dob < date '1900-01-01' or p_dob > current_date then
    raise exception 'Check your date of birth.';
  end if;
  if p_dob > (current_date - make_interval(years => v_min))::date then
    insert into private.age_gate_rejections (user_id) values (v_uid) on conflict do nothing;
    return false;
  end if;
  return true;
end $$;

-- Final step of onboarding. Re-checks everything server-side.
create function public.complete_onboarding(
  p_first_name text,
  p_suburb text,
  p_sports text[],
  p_level text,
  p_dob date,
  p_accept_rules boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_phone_ok boolean;
  s public.app_settings%rowtype;
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
  select * into s from public.app_settings where id;
  select lower(u.email), u.phone_confirmed_at is not null into v_email, v_phone_ok
  from auth.users u where u.id = v_uid;

  if v_email is null or split_part(v_email, '@', 2) <> all (s.allowed_email_domains) then
    raise exception 'Rally is open to UNSW students only. Sign in with your UNSW email.';
  end if;
  if s.require_phone and not coalesce(v_phone_ok, false) then
    raise exception 'Verify your phone number first.';
  end if;
  if not coalesce(p_accept_rules, false) then
    raise exception 'You need to agree to the ground rules.';
  end if;
  if exists (select 1 from private.age_gate_rejections r where r.user_id = v_uid)
     or p_dob is null
     or p_dob > (current_date - make_interval(years => s.min_age))::date then
    raise exception 'Rally is for adults % and over.', s.min_age;
  end if;
  if exists (select 1 from public.accounts a where a.user_id = v_uid) then
    raise exception 'Your account is already set up.';
  end if;

  insert into public.profiles (id, first_name, suburb, sports, level)
  values (v_uid, btrim(p_first_name), btrim(p_suburb), p_sports, p_level);
  insert into public.accounts (user_id, dob, rules_accepted_at)
  values (v_uid, p_dob, now());
end $$;

-- Locks the game row so two people can't take the last spot at once.
create function public.join_game(p_game uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  g public.games%rowtype;
  v_count int;
  v_name text;
begin
  if not private.is_active(v_uid) then raise exception 'Your account can''t join games right now.'; end if;
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'scheduled'
     or private.is_blocked_between(v_uid, g.host_id) or not private.is_active(g.host_id) then
    raise exception 'This game isn''t available.';
  end if;
  if g.starts_at <= now() then raise exception 'This game has already started.'; end if;
  if exists (select 1 from public.game_players p where p.game_id = p_game and p.user_id = v_uid) then
    return;
  end if;
  select count(*) into v_count from public.game_players p where p.game_id = p_game;
  if v_count >= g.capacity then raise exception 'This game is full.'; end if;

  insert into public.game_players (game_id, user_id) values (p_game, v_uid);
  select pr.first_name into v_name from public.profiles pr where pr.id = v_uid;
  insert into public.messages (game_id, kind, body) values (p_game, 'system', v_name || ' joined the game');
end $$;

create function public.leave_game(p_game uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
begin
  if exists (select 1 from public.games g where g.id = p_game and g.host_id = v_uid) then
    raise exception 'Hosts cancel the game instead of leaving it.';
  end if;
  delete from public.game_players p where p.game_id = p_game and p.user_id = v_uid;
  if found then
    select pr.first_name into v_name from public.profiles pr where pr.id = v_uid;
    insert into public.messages (game_id, kind, body) values (p_game, 'system', v_name || ' left the game');
  end if;
end $$;

create function public.cancel_game(p_game uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.games set status = 'cancelled'
  where id = p_game and host_id = auth.uid() and status = 'scheduled';
  if not found then raise exception 'Only the host can cancel this game.'; end if;
  insert into public.messages (game_id, kind, body) values (p_game, 'system', 'The host cancelled this game.');
end $$;

-- Strike ladder: 1st upheld report = warning, 2nd = 7-day pause, 3rd = ban.
create function public.moderate_report(p_report uuid, p_action text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_mod uuid := auth.uid();
  r public.reports%rowtype;
  v_strikes int;
  v_outcome text;
  v_ban boolean := false;
begin
  if not private.is_moderator(v_mod) then raise exception 'Moderators only.'; end if;
  select * into r from public.reports where id = p_report for update;
  if not found then raise exception 'Report not found.'; end if;
  if r.status <> 'open' then raise exception 'This report is already resolved.'; end if;
  if r.target_id = v_mod then raise exception 'Another moderator needs to review reports about you.'; end if;

  if p_action = 'dismiss' then
    update public.reports
      set status = 'dismissed', outcome = 'Dismissed, no action taken', resolved_by = v_mod, resolved_at = now()
      where id = p_report;
    if r.message_id is not null then
      update public.messages set flagged = false where id = r.message_id;
    end if;
    return 'Dismissed, no action taken';
  end if;

  if p_action = 'uphold' then
    update public.accounts set strikes = strikes + 1 where user_id = r.target_id
      returning strikes into v_strikes;
    if v_strikes >= 3 then
      v_ban := true;
      v_outcome := 'Banned (strike 3 of 3)';
    elsif v_strikes = 2 then
      update public.accounts set status = 'suspended', suspended_until = now() + interval '7 days'
        where user_id = r.target_id;
      v_outcome := 'Paused for 7 days (strike 2 of 3)';
    else
      v_outcome := 'Warning sent (strike 1 of 3)';
    end if;
  elsif p_action = 'ban' then
    update public.accounts set strikes = greatest(strikes, 3) where user_id = r.target_id;
    v_ban := true;
    v_outcome := 'Banned immediately';
  elsif p_action = 'lock' then
    update public.accounts set status = 'locked' where user_id = r.target_id;
    v_outcome := 'Locked until age is verified';
  else
    raise exception 'Unknown action.';
  end if;

  if v_ban then
    update public.accounts set status = 'banned', suspended_until = null where user_id = r.target_id;
    update public.messages set removed = true, body = null
      where sender_id = r.target_id and kind = 'user';
    update public.reports
      set status = 'upheld', outcome = 'Closed: account banned', resolved_by = v_mod, resolved_at = now()
      where target_id = r.target_id and status = 'open' and id <> p_report;
  elsif p_action = 'uphold' and r.message_id is not null then
    update public.messages set removed = true, body = null where id = r.message_id;
  end if;

  update public.reports
    set status = 'upheld', outcome = v_outcome, resolved_by = v_mod, resolved_at = now()
    where id = p_report;
  return v_outcome;
end $$;

revoke execute on function public.check_age(date) from public, anon;
revoke execute on function public.complete_onboarding(text, text, text[], text, date, boolean) from public, anon;
revoke execute on function public.join_game(uuid) from public, anon;
revoke execute on function public.leave_game(uuid) from public, anon;
revoke execute on function public.cancel_game(uuid) from public, anon;
revoke execute on function public.moderate_report(uuid, text) from public, anon;
grant execute on function public.check_age(date) to authenticated;
grant execute on function public.complete_onboarding(text, text, text[], text, date, boolean) to authenticated;
grant execute on function public.join_game(uuid) to authenticated;
grant execute on function public.leave_game(uuid) to authenticated;
grant execute on function public.cancel_game(uuid) to authenticated;
grant execute on function public.moderate_report(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.moods enable row level security;

create policy "settings: anyone can read" on public.app_settings
  for select to anon, authenticated using (true);

create policy "profiles: active users can read" on public.profiles
  for select to authenticated using (id = auth.uid() or private.is_active(auth.uid()));
create policy "profiles: edit your own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "accounts: read your own, moderators read all" on public.accounts
  for select to authenticated using (user_id = auth.uid() or private.is_moderator(auth.uid()));

create policy "games: visible to active users" on public.games
  for select to authenticated using (
    private.is_active(auth.uid())
    and (host_id = auth.uid()
         or (private.is_active(host_id) and not private.is_blocked_between(auth.uid(), host_id)))
  );
create policy "games: active users can host" on public.games
  for insert to authenticated with check (
    host_id = auth.uid()
    and private.is_active(auth.uid())
    and status = 'scheduled'
    and starts_at > now()
    and starts_at < now() + interval '60 days'
    and not private.is_abusive(title)
    and not private.is_abusive(notes)
  );

create policy "players: visible for games you can see" on public.game_players
  for select to authenticated using (exists (select 1 from public.games g where g.id = game_id));

create policy "messages: members can read" on public.messages
  for select to authenticated using (
    private.is_active(auth.uid())
    and private.is_game_member(game_id)
    and (sender_id is null or not private.is_blocked_between(auth.uid(), sender_id))
  );
create policy "messages: members can send" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and kind = 'user'
    and private.is_active(auth.uid())
    and private.is_game_member(game_id)
  );

create policy "blocks: manage your own" on public.blocks
  for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy "reports: active users can file" on public.reports
  for insert to authenticated with check (
    source = 'user' and reporter_id = auth.uid() and private.is_active(auth.uid())
  );
create policy "reports: read your own, moderators read all" on public.reports
  for select to authenticated using (reporter_id = auth.uid() or private.is_moderator(auth.uid()));

create policy "moods: manage your own" on public.moods
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and private.is_game_member(game_id)
    and exists (select 1 from public.games g where g.id = game_id and g.starts_at < now())
  );

-- Live chat
alter publication supabase_realtime add table public.messages;

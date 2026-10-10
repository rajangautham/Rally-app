-- Security tests for the Rally schema. Each check prints "ok: ..." or "FAIL: ...".
-- Run with scripts/test-db.sh
\set QUIET on
\pset tuples_only on
\set ON_ERROR_STOP on

create function public.t_check(label text, passed boolean) returns void language plpgsql as $$
begin
  if passed then raise notice 'ok: %', label; else raise notice 'FAIL: %', label; end if;
end $$;
create function public.t_raises(label text, stmt text) returns void language plpgsql as $$
begin
  execute stmt;
  raise notice 'FAIL: % (no error)', label;
exception when others then
  raise notice 'ok: % (%)', label, sqlerrm;
end $$;

\set u1 '11111111-1111-1111-1111-111111111111'
\set u2 '22222222-2222-2222-2222-222222222222'
\set u3 '33333333-3333-3333-3333-333333333333'
\set u4 '44444444-4444-4444-4444-444444444444'
\set u5 '55555555-5555-5555-5555-555555555555'
\set u6 '66666666-6666-6666-6666-666666666666'
insert into auth.users (id, email, phone_confirmed_at) values
  (:'u1', 'alice@ad.unsw.edu.au', now()), (:'u2', 'Bob@Student.UNSW.edu.au', now()),
  (:'u3', 'eve@gmail.com', now()), (:'u4', 'kid@ad.unsw.edu.au', now()),
  (:'u5', 'carl@ad.unsw.edu.au', null), (:'u6', 'dana@ad.unsw.edu.au', now());

-- Onboarding ------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :'u1', false) \g /dev/null
select t_check('adult passes age check', public.check_age('2000-01-01'));
select public.complete_onboarding('Alice', 'Kensington', array['badminton'], 'fun', '2000-01-01', true);
select set_config('request.jwt.claim.sub', :'u2', false) \g /dev/null
select public.complete_onboarding('Bob', 'Kingsford', array['football'], 'some', '1998-03-03', true);
select set_config('request.jwt.claim.sub', :'u6', false) \g /dev/null
select public.complete_onboarding('Dana', 'Randwick', array['badminton'], 'fun', '2001-07-07', true);
select set_config('request.jwt.claim.sub', :'u3', false) \g /dev/null
select t_raises('non-UNSW email rejected', $$select public.complete_onboarding('Eve','Bondi',array['tennis'],'fun','1990-01-01',true)$$);
select set_config('request.jwt.claim.sub', :'u4', false) \g /dev/null
select t_check('17-year-old fails age check', not public.check_age((current_date - interval '17 years')::date));
select t_check('retrying with an adult date still fails', not public.check_age('1995-01-01'));
select t_raises('under-18 cannot finish onboarding', $$select public.complete_onboarding('Kid','Kensington',array['tennis'],'fun','1995-01-01',true)$$);
select set_config('request.jwt.claim.sub', :'u5', false) \g /dev/null
select t_raises('unverified phone rejected', $$select public.complete_onboarding('Carl','Coogee',array['tennis'],'fun','1995-01-01',true)$$);

-- Games -----------------------------------------------------------------------
select set_config('request.jwt.claim.sub', :'u1', false) \g /dev/null
insert into public.games (host_id, sport, title, venue, starts_at, capacity, level)
  values (:'u1', 'badminton', 'Casual doubles', 'Kensington courts', now() + interval '1 day', 2, 'fun')
  returning id as gid \gset
select t_raises('abusive game title blocked', $$insert into public.games (host_id, sport, title, venue, starts_at, capacity, level) values (auth.uid(),'badminton','idiot game','x', now() + interval '1 day', 4, 'fun')$$);
select t_raises('game in the past blocked', $$insert into public.games (host_id, sport, title, venue, starts_at, capacity, level) values (auth.uid(),'badminton','Past','x', now() - interval '1 day', 4, 'fun')$$);
select t_check('host is added as a player', (select count(*) from public.game_players where game_id = :'gid') = 1);
select set_config('request.jwt.claim.sub', :'u2', false) \g /dev/null
select t_check('other players can see the game', (select count(*) from public.games) = 1);
select public.join_game(:'gid');
select set_config('request.jwt.claim.sub', :'u6', false) \g /dev/null
select t_raises('full game cannot be joined', format('select public.join_game(%L)', :'gid'));
select t_check('non-member cannot read chat', (select count(*) from public.messages) = 0);

-- Chat, filtering, privilege checks -----------------------------------------------
select set_config('request.jwt.claim.sub', :'u2', false) \g /dev/null
insert into public.messages (game_id, sender_id, body) values (:'gid', :'u2', 'hi all') returning id as hi_id \gset
insert into public.messages (game_id, sender_id, body) values (:'gid', :'u2', 'you are an idiot');
select t_check('abusive message is flagged', (select flagged from public.messages where body = 'you are an idiot'));
select t_raises('cannot send as someone else', format('insert into public.messages (game_id, sender_id, body) values (%L, %L, %L)', :'gid', :'u1', 'impersonation'));
select t_check('players only see their own account row', (select count(*) from public.accounts) = 1);
update public.accounts set is_moderator = true;
select t_check('players cannot make themselves moderators', not (select is_moderator from public.accounts));

-- Blocking -----------------------------------------------------------------------
select set_config('request.jwt.claim.sub', :'u1', false) \g /dev/null
insert into public.blocks values (:'u1', :'u2');
select t_check('blocker no longer sees blocked user''s messages', (select count(*) from public.messages where sender_id = :'u2') = 0);
select set_config('request.jwt.claim.sub', :'u2', false) \g /dev/null
select t_check('blocked user no longer sees blocker''s games', (select count(*) from public.games) = 0);
select set_config('request.jwt.claim.sub', :'u1', false) \g /dev/null
delete from public.blocks;

-- Reports and the strike ladder ------------------------------------------------------
insert into public.reports (target_id, message_id, reason) values (:'u1', :'hi_id', 'spam');
select t_check('report target is taken from the message, not the client',
  (select target_id = :'u2' and message_snapshot = 'hi all' from public.reports where source = 'user'));
reset role;
update public.accounts set is_moderator = true where user_id = :'u1';
set role authenticated;
select t_check('moderator sees all reports', (select count(*) from public.reports) = 2);
select t_check('1st upheld report is a warning',
  public.moderate_report((select id from public.reports where source = 'auto'), 'uphold') like 'Warning%');
select t_check('upheld message is removed and its text cleared',
  (select removed and body is null from public.messages where id = (select message_id from public.reports where source = 'auto')));
select t_check('2nd upheld report pauses the account',
  public.moderate_report((select id from public.reports where source = 'user' and status = 'open'), 'uphold') like 'Paused%');
select set_config('request.jwt.claim.sub', :'u2', false) \g /dev/null
select t_check('paused user sees no games', (select count(*) from public.games) = 0);
select t_raises('paused user cannot send', format('insert into public.messages (game_id, sender_id, body) values (%L, %L, %L)', :'gid', :'u2', 'x'));
reset role;
update public.accounts set suspended_until = now() - interval '1 minute' where user_id = :'u2';
set role authenticated;
select t_check('pause ends by itself when time is up', (select count(*) from public.games) = 1);
insert into public.reports (target_id, game_id, reason) values (:'u1', :'gid', 'other');
select set_config('request.jwt.claim.sub', :'u1', false) \g /dev/null
select t_raises('moderators cannot rule on reports about themselves',
  $$select public.moderate_report((select id from public.reports where target_id = auth.uid()), 'dismiss')$$);
insert into public.reports (target_id, game_id, reason) values (:'u2', :'gid', 'harass');
select t_check('ban works',
  public.moderate_report((select id from public.reports where target_id = :'u2' and status = 'open' limit 1), 'ban') like 'Banned%');
reset role;
select t_check('banned user''s messages are all removed', (select count(*) from public.messages where sender_id = :'u2' and not removed) = 0);
select t_check('other open reports about a banned user are closed', (select count(*) from public.reports where target_id = :'u2' and status = 'open') = 0);

-- Moods and cancelling -------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :'u1', false) \g /dev/null
select t_raises('mood cannot be logged before the game', format('insert into public.moods values (%L, %L, 4)', :'u1', :'gid'));
reset role;
update public.games set starts_at = now() - interval '1 hour';
set role authenticated;
insert into public.moods (user_id, game_id, mood) values (:'u1', :'gid', 4);
select t_check('mood logged after the game', (select mood from public.moods) = 4);
select t_raises('host cannot leave their own game', format('select public.leave_game(%L)', :'gid'));
select public.cancel_game(:'gid');
select t_check('host can cancel', (select status from public.games) = 'cancelled');
reset role;
drop function public.t_check(text, boolean);
drop function public.t_raises(text, text);

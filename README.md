# Rally

Find people to play with. Rally is a mobile app that helps UNSW students who feel isolated find pickup games, running groups and a friendly face to go with them, with strict safety rules because it involves meeting strangers.

Built with Expo (React Native, TypeScript) and Supabase (Postgres, auth, realtime).

## What the MVP does

- **Sign-up gate.** UNSW email only (one-time code, no password), date of birth 18+, phone verification, and agreeing to the ground rules. All of it is enforced in the database, not just the app.
- **Games.** Discover upcoming games by sport, host your own (public places only), join or leave. Two people can't grab the last spot at once, because joining locks the game row.
- **Group chat** for each game, live.
- **Safety.** Report a message, game or player. Block someone so neither of you sees the other's games or messages. A "pause before sending" check catches rude messages, and a supportive prompt with crisis lines appears if a message sounds like distress.
- **Moderation.** A queue for moderators and a strike ladder: warning, then a 7-day pause, then a ban. The server also flags abusive messages on its own, so the filter works even against a modified app.
- **Wellbeing.** A Support tab with Australian crisis lines, and a private "how did you feel after this game?" check-in.

## Setup

1. **Create a Supabase project** (the free tier is fine).
2. **Apply the schema.** Paste `supabase/migrations/20260925000000_init.sql` into the SQL editor and run it. Or use the CLI: `supabase link` then `supabase db push`.
3. **Email sign-in codes.** In Authentication → Email Templates → Magic Link, include `{{ .Token }}` so the email contains a code rather than only a link. Supabase's built-in email sender is for testing only and is heavily limited, so set up custom SMTP (Resend, Postmark, etc.) before inviting real users.
4. **Phone verification.** Enable the Phone provider and add an SMS provider such as Twilio (a trial account works for testing; each text costs a few cents after that). To skip phone checks while developing, run `update app_settings set require_phone = false;`.
5. **App config.** Copy `.env.example` to `.env` and fill in your project URL and publishable (or anon) key.
6. **Run it:** `npm install`, then `npx expo start`, and open it in Expo Go.
7. **Make yourself a moderator** after signing up:
   ```sql
   update accounts set is_moderator = true
   where user_id = (select id from auth.users where email = 'you@ad.unsw.edu.au');
   ```

Allowed email domains and the minimum age live in the `app_settings` table. Check the domains match what UNSW student inboxes actually use before launch.

## Checks

```bash
npm run typecheck                                  # TypeScript
PGHOST=localhost PGUSER=postgres scripts/test-db.sh  # 34 database security tests
```

The database tests run against a throwaway local Postgres, using `supabase/tests/stub_auth.sql` to stand in for Supabase's `auth` schema. They cover the sign-up rules, age gate, capacity, impersonation, blocking, report integrity, the strike ladder, pauses expiring and self-moderation.

## How safety is enforced

The app's checks are for a smooth experience. The real rules live in Postgres:

- **Row-level security on every table.** Players read only their own private `accounts` row, so strikes and date of birth stay private. Moderators can read all of them.
- **Profiles are split in two.** `profiles` is public (first name, suburb, sports), and `accounts` is private (date of birth, strikes, status).
- **Helper functions live in a `private` schema** that the API doesn't expose, so nobody can call them directly, for example to find out who blocked whom.
- **Under-age attempts are recorded,** so someone who enters a date under 18 can't retry with a different date on the same account.
- **Report integrity.** When a message is reported, the database fills in who is being reported and what they said from the message itself. The app can't frame someone.
- **Removed messages have their text deleted,** and moderators still see the snapshot kept in the report.
- **Pauses end automatically** when `suspended_until` passes. No scheduled job is needed.

## Project structure

```
src/app/            Screens (Expo Router). (auth), (onboarding), (tabs), game/[id], host, report, moderation
src/components/     UI building blocks, court header, game row
src/lib/            Supabase client, theme, constants, types, formatting, moderation checks
src/providers/      Auth session and onboarding state
supabase/           Migration and security tests
```

## Roadmap

- **v1, trust and community:** reliability score for no-shows, "play again" connections, push notifications, an AI model for message checks in an Edge Function instead of the word list, and moderated support circles with trained moderators.
- **v2, professional help:** psychologists and counsellors from official directories such as Healthdirect's National Health Services Directory, with bulk-billing and telehealth filters.
- **v3, health data:** opt-in Apple HealthKit and Android Health Connect, showing activity and sleep next to after-game moods. This needs a development build.
- **v4, scale:** "people you'd get along with" suggestions from the who-plays-with-whom graph, clubs and leagues, venue booking, and more cities.

Rally helps people find company. It isn't a crisis service, and the app says so wherever it matters.

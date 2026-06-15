# WatchMeRun 🏃

A small Expo app that lets Kenz see Ben's current-week training schedule,
upcoming races, live run status (start/stop), and what's playing on Spotify —
without daily verbal updates.

**Stack:** Expo (React Native, TypeScript) + Supabase (Postgres + Edge
Functions) + Expo Push + Spotify Web API.

v1 is single-runner, but the schema carries a `runner_id` seam from day one so
it can later support multiple runners without a painful migration. Everything is
built single-user — one `runner_id` is hardcoded via config.

## Layout

```
src/
  app/              # expo-router screens: index (This Week), races, live
  components/        # Screen scaffold, Card, themed primitives, tabs
  lib/               # config, supabase client, typed queries, push, date helpers
supabase/
  migrations/        # schema + RLS + seed (runner, races)
  seed.sql           # optional sample week for the This Week screen
  functions/         # Deno Edge Functions (the only writers / Spotify caller)
    register-token/  # app registers its Expo push token here
    update-week/     # Ben curls this to set the week (bearer auth)
    run-event/       # the iOS Shortcut hits this on start/stop (bearer auth)
    now-playing/     # Live screen polls this every 30s (public read)
    _shared/         # cors, env/admin client, expo push, spotify helpers
```

Design rules: no secrets on Kenz's device (the app holds only the anon key +
runner id); Edge Functions are the only writers for run events and the only
Spotify caller; the app is read-mostly.

## Setup

### 1. Supabase project + schema

```bash
supabase link --project-ref <your-project-ref>
supabase db push                 # applies supabase/migrations
# optional sample week:
supabase db execute --file supabase/seed.sql
```

Grab Ben's runner id — you'll need it in two places:

```sql
select id from runners where handle = 'ben';
```

### 2. Edge Function secrets + deploy

```bash
# supabase/functions/.env  (see .env.example) — do NOT commit
#   RUNWATCH_TOKEN=<any long random string>
#   RUNNER_ID=<Ben's runner id from above>
supabase secrets set --env-file supabase/functions/.env

supabase functions deploy register-token update-week run-event now-playing
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform —
you don't set them. All four functions run with `verify_jwt = false`
(`supabase/config.toml`) because they do their own auth.

### 3. Spotify (one-time, manual — needs Ben's login)

This cannot be automated; it requires Ben's Spotify account.

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard); note the Client ID + Secret.
2. Add redirect URI `http://127.0.0.1:8888/callback`.
3. Open the authorize URL (scopes `user-read-currently-playing user-read-playback-state`), approve, and copy the `code` from the redirect.
4. Exchange it for tokens:
   ```bash
   curl -X POST https://accounts.spotify.com/api/token \
     -d grant_type=authorization_code \
     -d code=AUTH_CODE \
     -d redirect_uri=http://127.0.0.1:8888/callback \
     -d client_id=CLIENT_ID -d client_secret=CLIENT_SECRET
   ```
5. Store all three in `app_secrets`, scoped to Ben's runner:
   ```sql
   insert into app_secrets (runner_id, key, value) values
     ((select id from runners where handle='ben'), 'spotify_client_id', '...'),
     ((select id from runners where handle='ben'), 'spotify_client_secret', '...'),
     ((select id from runners where handle='ben'), 'spotify_refresh_token', '...');
   ```
6. Test: `curl https://<project>.supabase.co/functions/v1/now-playing`

### 4. The app

```bash
cp .env.example .env     # fill in SUPABASE_URL, ANON_KEY, RUNNER_ID
npm install
npx expo start
```

Push notifications need an EAS project id. Run `eas init` (writes
`extra.eas.projectId` into the app config); `registerForPush` reads it and falls
back gracefully in Expo Go / on simulators.

### 5. iOS Shortcut ("Start Run" / "Stop Run")

Ben builds this in the Shortcuts app:

- **Choose from Menu** → workout type (Open / Distance-Time / Custom), optionally **Ask for Input** for a label.
- **Get Contents of URL** → POST `https://<project>.supabase.co/functions/v1/run-event`
  - Headers: `Authorization: Bearer <RUNWATCH_TOKEN>`, `Content-Type: application/json`
  - Body: `{ "event_type": "start", "workout_type": "<chosen>", "workout_label": "<input>" }`
- A second Shortcut posts the same with `"event_type": "stop"`.

No `runner_id` in the payload — the Edge Function supplies it from its
`RUNNER_ID` env.

## Curl reference

```bash
# Set the week
curl -X POST https://<project>.supabase.co/functions/v1/update-week \
  -H "Authorization: Bearer $RUNWATCH_TOKEN" -H "Content-Type: application/json" \
  -d '{"week_start":"2026-06-15","days":[
        {"day_date":"2026-06-15","title":"Easy 6mi","workout_type":"distance_time","detail":"z2"},
        {"day_date":"2026-06-16","title":"Rest","workout_type":"rest"}]}'

# Fire a run start
curl -X POST https://<project>.supabase.co/functions/v1/run-event \
  -H "Authorization: Bearer $RUNWATCH_TOKEN" -H "Content-Type: application/json" \
  -d '{"event_type":"start","workout_type":"distance_time","workout_label":"6mi easy"}'
```

## v2 (scoped, not built)

Live GPS tracking via a new `live_positions` table (attaches to the existing
`run_events.run_id`) and a Ben-side background location reporter; multi-runner by
resolving `runner_id` from the request instead of env. See the spec for details.

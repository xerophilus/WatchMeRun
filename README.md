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

### 2. Deploy functions + mint a runner token

```bash
supabase functions deploy register-token update-week run-event now-playing
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform —
and there are no other function secrets. All four functions run with
`verify_jwt = false` (`supabase/config.toml`) because they do their own auth.

**Write auth is per-runner, not a global secret.** The write endpoints
(`update-week`, `run-event`) resolve which runner is writing from the bearer
token, looked up in `runner_tokens`. Mint one for Ben (this is the value his
iOS Shortcut will carry):

```sql
insert into runner_tokens (runner_id, token, label)
values ((select id from runners where handle = 'ben'),
        '<a-long-random-string>', 'Ben iPhone Shortcut');
```

To onboard a second runner later: add a `runners` row, their Spotify secrets,
and a `runner_tokens` row. No code or schema changes — each runner is their own
source of truth.

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
  - Headers: `Authorization: Bearer <Ben's runner_tokens token>`, `Content-Type: application/json`
  - Body: `{ "event_type": "start", "workout_type": "<chosen>", "workout_label": "<input>" }`
- A second Shortcut posts the same with `"event_type": "stop"`.

No `runner_id` in the payload — the Edge Function resolves it from the token.

### In-app "Start my run" button (runner-only)

The Live screen can show a Start/Stop control that hits the same `run-event`
beacon, so Ben can kick off a tracked run (now-playing snapshot + watcher push)
without leaving the app, then hand off to his run app of choice. It appears
**only** on a build that carries a write token — set `EXPO_PUBLIC_RUNNER_TOKEN`
(the same `runner_tokens` value the Shortcut uses) on Ben's device. Kenz's build
leaves it unset and stays read-only.

The button also picks a scheduled workout (defaults to today's) and tags the
run with its `workout_type` + `workout_label`, so the watcher push and run card
show the planned session. "No label" starts an unplanned run.

`EXPO_PUBLIC_PREFERRED_RUN_APP` (`apple_workout` | `apple_shortcut` | `strava` |
`nike_run_club` | `none`) sets which app the button opens after firing the
beacon. Note: no app exposes a "start my run" API — the button can only *open*
Strava/Nike to their record screen for the runner to tap go; plain Apple Workout
has no iPhone URL scheme, so that option is beacon-only. The `strava`/
`nikerunclub` schemes are declared in `app.json` under
`LSApplicationQueriesSchemes` so `canOpenURL` works.

#### Carrying the picked workout into Apple's Workout app (Shortcut bridge)

The selection can only be *handed to* the run app for Apple's Workout app, via a
watchOS Shortcut. Set `EXPO_PUBLIC_RUN_SHORTCUT_NAME` to the name of a Shortcut
Ben builds once; the "Apple Watch (Shortcut)" option then appears and, on Start,
WatchMeRun opens `shortcuts://run-shortcut?name=<name>&input=<json>` with the
picked workout as input:

```json
{ "type": "distance_time", "label": "Easy 6mi", "detail": "z2" }
```

The Shortcut (built in the Shortcuts app, run from the watch) should:

1. **Get Dictionary from Input** → read `type` / `label` / `detail`.
2. **Start Workout** (Outdoor Run), optionally mapping `type`/`label` to a goal.

Strava and Nike Run Club have no equivalent — they can't accept the workout on
start (Strava can only be retitled *after* upload via its API + OAuth).

## Curl reference

```bash
# $TOKEN is a runner's value from the runner_tokens table.

# Set the week
curl -X POST https://<project>.supabase.co/functions/v1/update-week \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"week_start":"2026-06-15","days":[
        {"day_date":"2026-06-15","title":"Easy 6mi","workout_type":"distance_time","detail":"z2"},
        {"day_date":"2026-06-16","title":"Rest","workout_type":"rest"}]}'

# Fire a run start
curl -X POST https://<project>.supabase.co/functions/v1/run-event \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"event_type":"start","workout_type":"distance_time","workout_label":"6mi easy"}'

# Now playing (read-only, runner named in the query)
curl "https://<project>.supabase.co/functions/v1/now-playing?runner_id=<runner_id>"
```

## v2 (groundwork laid)

Live GPS tracking is scaffolded but not wired to a real location source yet:

- `live_positions` table (attaches to the existing `run_events.run_id`), in the
  Realtime publication alongside `run_events`.
- `/position` Edge Function — bearer auth via `runner_tokens`, inserts a point
  and prunes stale rows. A Ben-side `expo-location` background reporter would
  POST here every ~15-30s during a run:
  ```bash
  curl -X POST https://<project>.supabase.co/functions/v1/position \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"lat":39.0,"lng":-76.9,"run_id":"<active run_id>"}'
  ```
- The Live screen subscribes via Supabase Realtime and shows a location card
  (currently lat/lng text — a `react-native-maps` `MapView` + breadcrumb trail
  drops in at the marked `TODO(v2)`).

Still to do for full v2: the background location reporter on Ben's phone,
auto-stopping position writes on the `stop` event, and gating location reads
behind a share code / auth. Multi-runner is already handled by the
`runner_tokens` model — onboarding another runner is just rows.

# WatchMeRun — Product Brief

_For design / App Store prep. Describes what the app is, who it's for, and every
screen + feature as currently built._

## One-liner
**Watch your crew train.** WatchMeRun is a private, invite-only companion for a
small group of runners to follow each other's training — schedule, races, and
live run status — without the noise of a public social network.

## Elevator pitch
Most run apps are either solo trackers (Strava, Nike Run Club, Apple Workout) or
loud public feeds. WatchMeRun is the opposite: a quiet, intimate space for a
handful of people who actually care about each other's running — training
partners, a coach and their athletes, a couple, a few friends chasing the same
race. You see what's on each other's calendar, what races are coming, and get a
nudge the moment someone heads out the door (with what they're listening to).
It rides _alongside_ whatever app you already record runs with.

## Who it's for
- **Training partners** keeping tabs on each other's weeks.
- **Coach ↔ athlete(s):** the coach posts the week; athletes follow it.
- **Partners / family** who want a low-effort "they're out running, back soon."
- Anyone who wants accountability from a chosen few, not a public audience.

## Core concept: watch by request (privacy first)
- Everyone who signs in is a **runner** with a display name and an **@handle**.
- To see someone's training you must **watch** them, and they must **approve**
  it (or hand you an invite, which auto-approves). It's not mutual by default —
  A watching B is separate from B watching A.
- Your schedule, races, run status, location, and music are visible **only** to
  people you've approved. Nothing is public.

## Screens & features (as built)

### 1. Sign in
- **Sign in with Apple** only. First run asks for a display name + @handle.

### 2. This Week
- Your training week, one card per day, with workout-type glyphs (run / hard /
  rest / open) and **today** highlighted.
- Your own week is editable by pasting plain text (a simple schedule format);
  others' weeks are read-only.
- A **person switcher** at the top toggles between "You" and anyone you watch.

### 3. Races
- A season race calendar with date, distance, location, countdown, and an
  **A-race** highlight for goal races. Past races dim out.

### 4. Live
- Real-time **run status**: Running / Resting, time since start, elapsed, and
  the current workout label.
- **Now playing** from the runner's Spotify (album art + track progress).
- **Live location:** a real map (Apple Maps) with the runner's route as a live
  breadcrumb trail and real distance / pace / elapsed time, shared with watchers
  while they run. Only the runner's own device captures GPS, in the background.
- For yourself: a **Start / Stop** control that fires a run "beacon" and can
  hand off to your run app of choice.

### 5. Crew
- **Invite links & codes** — generate and share; tapping/redeeming auto-approves
  the follow.
- **Find by @handle** — search and send a watch request.
- **Requests** — approve / decline people who want to watch you.
- Lists of **who you watch** and **who watches you**.
- **Connect Spotify** — link your own account so your now-playing shows on Live.

### Notifications
- Watchers get a push the moment someone they watch **starts** or **finishes** a
  run ("Ben started a run 🏃").

### Run hand-off (the "Start My Run" button)
- WatchMeRun does not record GPS itself; it fires the status beacon and then
  **opens the app you actually run with**. Honest constraint: no third-party app
  exposes a "start my run" API.
  - **Strava / Nike Run Club:** opens the app (to its record screen). Open-only.
  - **Apple Watch (plain):** beacon-only — iOS has no way to start a Watch
    workout from the phone.
  - **Apple Watch (Shortcut):** the one exception — a named watchOS Shortcut can
    receive the picked workout (type + goal) and actually start an Apple workout.
    Requires a one-time Shortcut setup on the watch.

## Not yet built (roadmap, in priority order)
1. **Run history** — past runs with their routes + weekly mileage, not just the
   live/latest run.
2. **Per-runner avatars / richer profiles.**
3. **Universal Links** so invite links open the app from Safari/Messages
   reliably (today they use the `watchmerun://` scheme).

## Brand / design notes
- **Name:** WatchMeRun. **Tone:** warm, personal, low-key — a group text, not a
  leaderboard.
- **Current palette:** teal (`#005B57` / deep `#00332F`) with an orange accent;
  light + dark themes.
- **Icon:** map/breadcrumb motif.
- Visual opportunities for design: the Live "someone's out running" moment, the
  weekly schedule, race countdowns, and the invite/crew flow are the emotional
  high points worth polishing.

## Draft App Store copy
- **App name:** WatchMeRun
- **Subtitle (30 chars):** Watch your crew train
- **Promo text:** Follow your running crew's training, races, and live runs —
  privately, by invite only.
- **Description:**
  > WatchMeRun is a private space for a small crew of runners to follow each
  > other's training. See everyone's weekly schedule and upcoming races, and get
  > a nudge the moment a training partner heads out — with what they're listening
  > to. No public feed, no followers, no noise: you only ever share with the
  > people you approve.
  >
  > • Post your week; follow your crew's.
  > • Track the season's races and countdowns.
  > • Go Live: see who's running right now, for how long, and their music.
  > • Invite by link or @handle — and approve who can watch you.
  > • Get notified when someone you follow starts or finishes a run.
  >
  > WatchMeRun works alongside the app you already record runs with.
- **Keywords:** running, training, crew, coach, schedule, races, accountability,
  private, partner, friends

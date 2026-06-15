// Date helpers for the displayed training week. All dates are handled as plain
// YYYY-MM-DD strings (no timezone math) to match the DATE columns in Postgres.

const DAY_MS = 24 * 60 * 60 * 1000;

function toLocalDate(iso: string): Date {
  // Parse YYYY-MM-DD as a local date (avoids the UTC-midnight off-by-one).
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Monday of the week containing `date` (defaults to today), as YYYY-MM-DD. */
export function mondayOf(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7; // days since Monday
  return toIso(new Date(d.getTime() - diff * DAY_MS));
}

export function todayIso(): string {
  return toIso(new Date());
}

export function isToday(iso: string): boolean {
  return iso === todayIso();
}

/** "Mon", "Tue", ... */
export function weekdayShort(iso: string): string {
  return toLocalDate(iso).toLocaleDateString(undefined, { weekday: 'short' });
}

/** "Jun 15" */
export function monthDay(iso: string): string {
  return toLocalDate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "Mon, Jun 15" */
export function fullDate(iso: string): string {
  return toLocalDate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Whole days from today until `iso` (negative = past). */
export function daysUntil(iso: string): number {
  const target = toLocalDate(iso).getTime();
  const today = toLocalDate(todayIso()).getTime();
  return Math.round((target - today) / DAY_MS);
}

/** "in 3 days" / "today" / "tomorrow" / "5 days ago" */
export function relativeDay(iso: string): string {
  const n = daysUntil(iso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 1) return `in ${n} days`;
  return `${Math.abs(n)} days ago`;
}

/** "9:42 AM" from a timestamptz string. */
export function clockTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "1h 23m" / "12 min" elapsed since a timestamptz string. */
export function elapsedSince(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

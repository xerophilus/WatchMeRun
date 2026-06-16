import { parseRunGoal } from '@/lib/run-apps';

// Parsing for the in-app "paste a week" schedule editor. The goal is a format
// that's trivial for a human to hand-type AND that an assistant (the way Ben
// builds his weeks) can emit verbatim. We accept two shapes and auto-detect:
//
//  1. Line format — one day per line, pipe-delimited:
//       2026-06-15 | Easy 6mi | z2
//       2026-06-16 | Rest
//       2026-06-17 | Intervals 6x800m | track | custom
//     Fields: date | title | detail? | workout_type?
//     Blank lines and lines starting with '#' are ignored. An optional
//     "Week of YYYY-MM-DD" header sets week_start (otherwise it's the earliest
//     day). When workout_type is omitted it's inferred from the text.
//
//  2. JSON — the same shape the update-week Edge Function takes, i.e. a bare
//     days array or { week_start?, days: [...] }. Handy for pasting straight
//     from a tool that already speaks JSON.

export type ParsedDay = {
  day_date: string;
  title: string;
  detail?: string;
  workout_type: string;
};

export type ParseResult =
  | { ok: true; weekStart: string; days: ParsedDay[] }
  | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Infer a workout_type from the free text when the user didn't give one. */
export function inferWorkoutType(title: string, detail?: string | null): string {
  if (/\b(rest|off|recovery day)\b/i.test(title)) return 'rest';
  const goal = parseRunGoal(undefined, title, detail);
  return goal.kind === 'open' ? 'custom' : 'distance_time';
}

function finalize(days: ParsedDay[], weekStartOverride?: string): ParseResult {
  if (days.length === 0) return { ok: false, error: 'No days found. Add at least one line.' };
  days.sort((a, b) => a.day_date.localeCompare(b.day_date));
  const weekStart = weekStartOverride ?? days[0].day_date;
  return { ok: true, weekStart, days };
}

function parseJson(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That looks like JSON but doesn't parse." };
  }
  const obj = data as { week_start?: unknown; days?: unknown };
  const rawDays = Array.isArray(data) ? data : Array.isArray(obj?.days) ? obj.days : null;
  if (!rawDays) return { ok: false, error: 'Expected an array of days, or { days: [...] }.' };

  const days: ParsedDay[] = [];
  for (let i = 0; i < rawDays.length; i++) {
    const r = rawDays[i] as Record<string, unknown>;
    const day_date = String(r?.day_date ?? '').trim();
    const title = String(r?.title ?? '').trim();
    if (!isValidDate(day_date)) return { ok: false, error: `Entry ${i + 1}: bad or missing day_date.` };
    if (!title) return { ok: false, error: `Entry ${i + 1}: missing title.` };
    const detail = r?.detail != null ? String(r.detail).trim() || undefined : undefined;
    const workout_type = r?.workout_type
      ? String(r.workout_type).trim()
      : inferWorkoutType(title, detail);
    days.push({ day_date, title, detail, workout_type });
  }
  const weekStart =
    typeof obj?.week_start === 'string' && isValidDate(obj.week_start) ? obj.week_start : undefined;
  return finalize(days, weekStart);
}

function parseLines(text: string): ParseResult {
  const lines = text.split('\n');
  let weekStartOverride: string | undefined;
  const days: ParsedDay[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const header = line.match(/^week\s+of\s+(\d{4}-\d{2}-\d{2})/i);
    if (header) {
      weekStartOverride = header[1];
      continue;
    }

    const parts = line.split('|').map((p) => p.trim());
    const [day_date, title, detail, type] = parts;
    if (!isValidDate(day_date)) {
      return { ok: false, error: `Line ${i + 1}: "${parts[0]}" isn't a YYYY-MM-DD date.` };
    }
    if (!title) return { ok: false, error: `Line ${i + 1}: missing a workout title after the date.` };
    days.push({
      day_date,
      title,
      detail: detail || undefined,
      workout_type: type || inferWorkoutType(title, detail),
    });
  }
  return finalize(days, weekStartOverride);
}

/** Parse pasted schedule text, auto-detecting JSON vs. the line format. */
export function parseSchedule(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Paste a schedule first.' };
  return trimmed.startsWith('{') || trimmed.startsWith('[')
    ? parseJson(trimmed)
    : parseLines(trimmed);
}

/**
 * Render a week back into the editable line format, so opening the editor shows
 * the current week ready to tweak. workout_type is only written when it differs
 * from what we'd infer, keeping the common case clean and round-trip stable.
 */
export function serializeWeek(
  weekStart: string,
  days: { day_date: string; title: string; detail?: string | null; workout_type?: string | null }[],
): string {
  const lines = [`Week of ${weekStart}`];
  for (const d of [...days].sort((a, b) => a.day_date.localeCompare(b.day_date))) {
    const detail = d.detail ?? '';
    const inferred = inferWorkoutType(d.title, d.detail);
    const needsType = d.workout_type && d.workout_type !== inferred;
    const fields = [d.day_date, d.title];
    if (detail || needsType) fields.push(detail);
    if (needsType) fields.push(d.workout_type as string);
    lines.push(fields.join(' | '));
  }
  return lines.join('\n');
}

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { updateWeek } from '@/lib/api';
import { weekdayShort } from '@/lib/date';
import { parseSchedule, serializeWeek } from '@/lib/schedule-format';
import { useSession } from '@/lib/session';
import type { ScheduleDay } from '@/lib/types';

const PLACEHOLDER = `Week of 2026-06-15
2026-06-15 | Easy 6mi | z2
2026-06-16 | Rest
2026-06-17 | Intervals 6x800m | track`;

/**
 * Runner-only schedule editor: paste a week (or tweak the current one) and save.
 * Wraps the update-week Edge Function. Accepts the simple line format or JSON
 * (see schedule-format.ts) and shows a live parsed preview before writing, so a
 * bad paste can't silently clobber the week. Only rendered when viewing yourself.
 */
export function ScheduleEditor({
  week,
  weekStart,
  onSaved,
}: {
  week: ScheduleDay[];
  weekStart: string | null;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const { me } = useSession();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  const parsed = useMemo(() => (text.trim() ? parseSchedule(text) : null), [text]);

  function expand() {
    // Seed with the current week so editing is just tweak-and-save.
    if (week.length > 0 && weekStart) setText(serializeWeek(weekStart, week));
    setError(null);
    setSaved(null);
    setOpen(true);
  }

  async function onSave() {
    if (!parsed || !parsed.ok || !me) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const count = await updateWeek(me.id, parsed.weekStart, parsed.days);
      setSaved(count);
      onSaved();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Pressable onPress={expand}>
        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            PASTE A WEEK
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Paste a whole week to {week.length > 0 ? 'replace this' : 'set the'} schedule, then tweak
            it day by day above.
          </ThemedText>
        </Card>
      </Pressable>
    );
  }

  return (
    <Card>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
        EDIT SCHEDULE
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.help}>
        One day per line: {'date | workout | detail'}. Blank lines and #comments are
        ignored. JSON is fine too.
      </ThemedText>

      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          setSaved(null);
        }}
        placeholder={PLACEHOLDER}
        placeholderTextColor={theme.textSecondary}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
        ]}
      />

      {parsed && !parsed.ok ? (
        <ThemedText type="small" style={[styles.note, { color: theme.accent }]}>
          {parsed.error}
        </ThemedText>
      ) : null}

      {parsed && parsed.ok ? (
        <View style={styles.preview}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.previewLabel}>
            Week of {parsed.weekStart} · {parsed.days.length}{' '}
            {parsed.days.length === 1 ? 'day' : 'days'}
          </ThemedText>
          {parsed.days.map((d) => (
            <ThemedText key={d.day_date} type="small" style={styles.previewRow}>
              <ThemedText type="smallBold">{weekdayShort(d.day_date)}</ThemedText>
              {`  ${d.title}`}
              {d.detail ? (
                <ThemedText themeColor="textSecondary">{`  · ${d.detail}`}</ThemedText>
              ) : null}
            </ThemedText>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => setOpen(false)}
          disabled={busy}
          style={[styles.button, styles.cancel, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="default" style={styles.cancelText}>
            Cancel
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={busy || !parsed || !parsed.ok}
          style={[
            styles.button,
            styles.save,
            { backgroundColor: theme.accent },
            busy || !parsed || !parsed.ok ? styles.disabled : undefined,
          ]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="default" style={styles.saveText}>
              Save week
            </ThemedText>
          )}
        </Pressable>
      </View>

      {saved != null ? (
        <ThemedText type="small" style={[styles.note, { color: theme.tint }]}>
          Saved {saved} {saved === 1 ? 'day' : 'days'}. Pull to refresh.
        </ThemedText>
      ) : null}
      {error ? (
        <ThemedText type="small" style={[styles.note, { color: theme.accent }]}>
          {error}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: Spacing.one, letterSpacing: 1 },
  help: { marginBottom: Spacing.two },
  input: {
    minHeight: 140,
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.three,
    fontSize: 15,
    fontFamily: 'Courier',
    textAlignVertical: 'top',
  },
  preview: { marginTop: Spacing.three, gap: Spacing.half },
  previewLabel: { marginBottom: Spacing.one, letterSpacing: 0.5 },
  previewRow: { lineHeight: 22 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancel: {},
  cancelText: { fontWeight: '700' },
  save: {},
  saveText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  note: { marginTop: Spacing.two },
});

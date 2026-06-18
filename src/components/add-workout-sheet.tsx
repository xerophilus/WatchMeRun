import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fullDate, weekDates, weekdayShort } from '@/lib/date';
import {
  defaultSessionTitle,
  formatMiles,
  SESSION_TYPE_META,
  SESSION_TYPES,
  sessionMiles,
  type SessionType,
} from '@/lib/session-type';

export type NewSession = {
  day_date: string;
  title: string;
  detail?: string;
  workout_type: SessionType;
};

/**
 * A focused bottom sheet for adding one session to the week — day, type, title,
 * distance, and an optional note. Slides up over a dimming scrim; tapping the
 * scrim or the close button dismisses without saving. Replaces the old
 * free-text "paste a week" editor for the common case.
 */
export function AddWorkoutSheet({
  visible,
  weekStart,
  initialDate,
  onAdd,
  onClose,
}: {
  visible: boolean;
  weekStart: string;
  initialDate: string;
  onAdd: (session: NewSession) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);

  const [dayDate, setDayDate] = useState(initialDate);
  const [type, setType] = useState<SessionType>('easy');
  const [title, setTitle] = useState('');
  const [distance, setDistance] = useState('');
  const [note, setNote] = useState('');

  // Reset to a clean sheet each time it opens for a (possibly new) day.
  useEffect(() => {
    if (!visible) return;
    setDayDate(initialDate);
    setType('easy');
    setTitle('');
    setDistance('');
    setNote('');
  }, [visible, initialDate]);

  const isRest = type === 'rest';
  const miles = parseFloat(distance);
  const titlePlaceholder = defaultSessionTitle(type, Number.isFinite(miles) ? miles : undefined);

  function save() {
    let finalTitle = title.trim() || titlePlaceholder;
    // Planned miles are parsed from the session text (there's no distance
    // column), so when a distance was entered make sure it's reflected in the
    // title — the default title already includes it; a custom one might not.
    if (!isRest && Number.isFinite(miles) && miles > 0) {
      const hasMiles = sessionMiles({ workout_type: type, title: finalTitle }) > 0;
      if (!hasMiles) finalTitle = `${finalTitle} ${formatMiles(miles)}mi`;
    }
    onAdd({
      day_date: dayDate,
      title: finalTitle,
      detail: note.trim() || undefined,
      workout_type: type,
    });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.fill}>
          {/* Stop touches on the sheet from dismissing via the scrim. */}
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
            onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <ThemedText type="title" style={styles.heading}>
                Add Workout
              </ThemedText>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={[styles.close, { backgroundColor: theme.backgroundSelected }]}>
                <SymbolView
                  name="xmark"
                  size={14}
                  tintColor={theme.textSecondary}
                  weight="bold"
                  fallback={<ThemedText themeColor="textSecondary">✕</ThemedText>}
                />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* DAY */}
              <FieldLabel>DAY</FieldLabel>
              <View style={styles.dayRow}>
                {dates.map((d) => {
                  const active = d === dayDate;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setDayDate(d)}
                      style={[
                        styles.dayChip,
                        { backgroundColor: active ? theme.accent : theme.backgroundSelected },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={[styles.dayChipText, active ? styles.activeText : undefined]}>
                        {weekdayShort(d).charAt(0)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.daySubtitle}>
                {fullDate(dayDate)}
              </ThemedText>

              {/* TYPE */}
              <FieldLabel>TYPE</FieldLabel>
              <View style={styles.typeRow}>
                {SESSION_TYPES.map((t) => {
                  const meta = SESSION_TYPE_META[t];
                  const active = t === type;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setType(t)}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: active
                            ? withAlpha(theme.accent, 0.16)
                            : theme.backgroundSelected,
                          borderColor: active ? theme.accent : 'transparent',
                        },
                      ]}>
                      <SymbolView
                        name={meta.symbol}
                        size={18}
                        tintColor={active ? theme.accent : theme.textSecondary}
                        weight="semibold"
                        fallback={<ThemedText>{meta.emoji}</ThemedText>}
                      />
                      <ThemedText
                        type="small"
                        style={[
                          styles.typeLabel,
                          { color: active ? theme.accent : theme.text },
                        ]}>
                        {meta.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* TITLE */}
              <FieldLabel>TITLE</FieldLabel>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={titlePlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected },
                ]}
              />

              {/* DISTANCE — hidden for Rest */}
              {!isRest ? (
                <>
                  <FieldLabel>DISTANCE</FieldLabel>
                  <View style={styles.distanceRow}>
                    <TextInput
                      value={distance}
                      onChangeText={setDistance}
                      placeholder="0"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="decimal-pad"
                      style={[
                        styles.input,
                        styles.distanceInput,
                        { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected },
                      ]}
                    />
                    <ThemedText themeColor="textSecondary" style={styles.distanceUnit}>
                      miles
                    </ThemedText>
                  </View>
                </>
              ) : null}

              {/* NOTE */}
              <FieldLabel>NOTE</FieldLabel>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="z2 · HR <155 · by feel"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected },
                ]}
              />

              <Pressable
                onPress={save}
                style={[styles.saveButton, { backgroundColor: theme.accent }]}>
                <ThemedText type="default" style={styles.saveText}>
                  Add to schedule
                </ThemedText>
              </Pressable>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  heading: { textTransform: 'uppercase', fontSize: 30, lineHeight: 38 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { letterSpacing: 1.2, fontSize: 11, marginTop: Spacing.three, marginBottom: Spacing.two },
  dayRow: { flexDirection: 'row', gap: Spacing.two },
  dayChip: { flex: 1, height: 44, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  dayChipText: { fontSize: 15 },
  activeText: { color: '#fff' },
  daySubtitle: { marginTop: Spacing.two },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1.5,
  },
  typeLabel: { fontWeight: '600' },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    minHeight: 48,
  },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  distanceInput: { flex: 1 },
  distanceUnit: { fontSize: 16 },
  saveButton: {
    marginTop: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});

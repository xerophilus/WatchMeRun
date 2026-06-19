import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
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
import { isValidIsoDate } from '@/lib/date';
import type { RaceInput } from '@/lib/api';
import type { Race } from '@/lib/types';

/**
 * Add or edit one of my own races. Slides up over a dimming scrim; tapping the
 * scrim or the close button dismisses without saving. In edit mode it also
 * offers a remove action.
 */
export function RaceEditorSheet({
  visible,
  race,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean;
  /** The race being edited, or null to add a new one. */
  race: Race | null;
  onSave: (input: RaceInput, id?: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [distance, setDistance] = useState('');
  const [location, setLocation] = useState('');
  const [isARace, setIsARace] = useState(false);
  const [notes, setNotes] = useState('');

  // Reset / prefill each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setName(race?.name ?? '');
    setDate(race?.race_date ?? '');
    setDistance(race?.distance ?? '');
    setLocation(race?.location ?? '');
    setIsARace(Boolean(race?.is_a_race));
    setNotes(race?.notes ?? '');
  }, [visible, race]);

  const dateValid = isValidIsoDate(date.trim());
  const canSave = name.trim().length > 0 && dateValid;

  function save() {
    if (!canSave) return;
    onSave(
      {
        name: name.trim(),
        race_date: date.trim(),
        distance: distance.trim() || null,
        location: location.trim() || null,
        is_a_race: isARace,
        notes: notes.trim() || null,
      },
      race?.id,
    );
    onClose();
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.fill}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <ThemedText type="title" style={styles.heading}>
                {race ? 'Edit Race' : 'Add Race'}
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
              <FieldLabel>NAME</FieldLabel>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Western States 100"
                placeholderTextColor={theme.textSecondary}
                style={inputStyle}
              />

              <FieldLabel>DATE</FieldLabel>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="2026-06-27"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                style={[
                  ...inputStyle,
                  date.length > 0 && !dateValid ? { borderColor: theme.accent } : null,
                ]}
              />
              {date.length > 0 && !dateValid ? (
                <ThemedText type="small" style={[styles.hint, { color: theme.accent }]}>
                  Use YYYY-MM-DD, e.g. 2026-06-27.
                </ThemedText>
              ) : null}

              <View style={styles.splitRow}>
                <View style={styles.splitCol}>
                  <FieldLabel>DISTANCE</FieldLabel>
                  <TextInput
                    value={distance}
                    onChangeText={setDistance}
                    placeholder="100M"
                    placeholderTextColor={theme.textSecondary}
                    style={inputStyle}
                  />
                </View>
                <View style={styles.splitCol}>
                  <FieldLabel>LOCATION</FieldLabel>
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Auburn, CA"
                    placeholderTextColor={theme.textSecondary}
                    style={inputStyle}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => setIsARace((v) => !v)}
                style={[styles.toggleRow, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
                <View style={styles.toggleText}>
                  <ThemedText type="default" style={styles.toggleTitle}>
                    A-race
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Your season goal — anchors the countdown.
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.switch,
                    { backgroundColor: isARace ? theme.accent : theme.backgroundSelected },
                  ]}>
                  <View style={[styles.knob, isARace ? styles.knobOn : styles.knobOff]} />
                </View>
              </Pressable>

              <FieldLabel>NOTES</FieldLabel>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Goal, qualifier, travel…"
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[...inputStyle, styles.notesInput]}
              />

              <Pressable
                onPress={save}
                disabled={!canSave}
                style={[styles.saveButton, { backgroundColor: theme.accent }, !canSave && styles.disabled]}>
                <ThemedText type="default" style={styles.saveText}>
                  {race ? 'Save changes' : 'Add to calendar'}
                </ThemedText>
              </Pressable>

              {race ? (
                <Pressable
                  onPress={() => {
                    onDelete(race.id);
                    onClose();
                  }}
                  style={[styles.removeButton, { backgroundColor: withAlpha(theme.accent, 0.12) }]}>
                  <ThemedText type="default" style={[styles.removeText, { color: theme.accent }]}>
                    Remove race
                  </ThemedText>
                </Pressable>
              ) : null}
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
    maxHeight: '90%',
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
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    minHeight: 48,
  },
  hint: { marginTop: Spacing.one },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  splitRow: { flexDirection: 'row', gap: Spacing.three },
  splitCol: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  toggleText: { flex: 1, gap: Spacing.half },
  toggleTitle: { fontWeight: '700' },
  switch: { width: 48, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },
  saveButton: {
    marginTop: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  disabled: { opacity: 0.5 },
  removeButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  removeText: { fontWeight: '700' },
});

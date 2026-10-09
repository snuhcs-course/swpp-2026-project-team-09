/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, font, Icon, type IconName, radius, space } from '@/design-system';
import { DateTimeSheet, whenWords } from '../date-time-sheet';

export function FieldName({ children, hint }: { children: string; hint?: string }): ReactElement {
  return (
    <View style={styles.nameRow}>
      <Text style={styles.name}>{children}</Text>
      {hint === undefined ? null : <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export function FieldError({ children }: { children: string }): ReactElement {
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

interface ChoiceButtonProps {
  label: string;
  words: string;
  chosen: boolean;
  icon: IconName;
  onPress: () => void;
}

// A field's button that reads the choice, or what to choose while there is none.
function ChoiceButton({ label, words, chosen, icon, onPress }: ChoiceButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`${label} ${words}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.choice, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={[styles.choiceWords, !chosen && styles.unset]}>
        {words}
      </Text>
      <Icon color={color.inkMuted} name={icon} size={18} />
    </Pressable>
  );
}

interface TimeFieldProps {
  label: string;
  // What the button reads without a time.
  none: string;
  value: string | null;
  // The time the sheet shows when the field has none.
  from?: string | null;
  error: string | null;
  onPick: (instant: string) => void;
  // Takes the time away, for an optional field.
  onClear?: { label: string; onPress: () => void };
}

// `언제` and `끝나는 시간`: a button with the time chosen, which opens the date·time sheet under the field's name.
export function TimeField({ label, none, value, from, error, onPick, onClear }: TimeFieldProps): ReactElement {
  const [picking, setPicking] = useState(false);
  return (
    <View style={styles.field}>
      <FieldName>{label}</FieldName>
      <View style={styles.row}>
        <View style={styles.grow}>
          <ChoiceButton
            chosen={value !== null}
            icon="calendar"
            label={label}
            onPress={() => {
              setPicking(true);
            }}
            words={value === null ? none : whenWords(value)}
          />
        </View>
        {value === null || onClear === undefined ? null : (
          <Pressable
            accessibilityLabel={onClear.label}
            accessibilityRole="button"
            onPress={onClear.onPress}
            style={styles.square}
          >
            <Icon color={color.inkMuted} name="x" size={18} />
          </Pressable>
        )}
      </View>
      {error === null ? null : <FieldError>{error}</FieldError>}
      <DateTimeSheet
        onClose={() => {
          setPicking(false);
        }}
        onPick={onPick}
        open={picking}
        title={label}
        value={value ?? from ?? null}
      />
    </View>
  );
}

interface WhereFieldProps {
  words: string | null;
  onList: () => void;
  onMap: () => void;
}

// `어디서`: the button that opens 장소 선택's list, and beside it the map's.
export function WhereField({ words, onList, onMap }: WhereFieldProps): ReactElement {
  return (
    <View style={styles.field}>
      <FieldName>어디서</FieldName>
      <View style={styles.row}>
        <View style={styles.grow}>
          <ChoiceButton
            chosen={words !== null}
            icon="pin"
            label="어디서"
            onPress={onList}
            words={words ?? '장소 선택'}
          />
        </View>
        <Pressable accessibilityLabel="지도에서 선택" accessibilityRole="button" onPress={onMap} style={styles.square}>
          <Icon color={color.snuBlue} name="map" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const FIELD_HEIGHT = 50;

const styles = StyleSheet.create({
  field: { gap: space[2] },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  name: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
  hint: { fontFamily: font.medium, fontSize: 12, lineHeight: 20, color: color.inkMuted },
  error: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.danger },
  row: { flexDirection: 'row', gap: space[2] },
  grow: { flex: 1, minWidth: 0 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    height: FIELD_HEIGHT,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.blue50 },
  choiceWords: { flexShrink: 1, fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: color.ink },
  unset: { color: color.inkSubtle },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    width: FIELD_HEIGHT,
    height: FIELD_HEIGHT,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
});

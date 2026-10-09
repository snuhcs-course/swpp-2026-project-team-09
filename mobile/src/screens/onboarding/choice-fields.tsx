/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, shadow, size, space, text } from '@/design-system';
import type { CourseLevel } from './departments';
import { FieldLabel } from './field-label';
import type { GenderChoice } from './form';
import { Input } from './input';
import { Pill, PILL_ROW_GAP } from './pill';

const LEVELS: readonly { level: CourseLevel; label: string }[] = [
  { level: 'undergraduate', label: '학부생' },
  { level: 'graduate', label: '대학원생' },
];

// The course level: one of two, side by side.
export function CourseLevelField({
  value,
  onChange,
}: {
  value: CourseLevel;
  onChange: (level: CourseLevel) => void;
}): ReactElement {
  return (
    <View accessibilityLabel="소속 과정" accessibilityRole="radiogroup" style={styles.field}>
      <FieldLabel>과정</FieldLabel>
      <View style={styles.track}>
        {LEVELS.map(({ level, label }) => (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="radio"
            accessibilityState={{ checked: level === value }}
            aria-checked={level === value}
            key={level}
            onPress={() => {
              onChange(level);
            }}
            style={[styles.level, level === value && styles.levelOn]}
          >
            <Text style={[styles.levelWords, level === value && styles.levelWordsOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const GENDERS: readonly { choice: GenderChoice; label: string }[] = [
  { choice: 'none', label: '선택 안 함' },
  { choice: 'female', label: '여성' },
  { choice: 'male', label: '남성' },
  { choice: 'custom', label: '직접 입력' },
];
const LONGEST_GENDER = 30;

interface GenderFieldProps {
  value: GenderChoice;
  // The User's own words, asked for with "직접 입력".
  words: string;
  onChange: (choice: GenderChoice) => void;
  onChangeWords: (words: string) => void;
}

// The gender, which a User may leave out or say in their own words.
export function GenderField({ value, words, onChange, onChangeWords }: GenderFieldProps): ReactElement {
  return (
    <View accessibilityLabel="성별 (선택)" accessibilityRole="radiogroup" style={styles.field}>
      <FieldLabel>성별</FieldLabel>
      <View style={styles.genders}>
        {GENDERS.map(({ choice, label }) => (
          <Pill
            checked={choice === value}
            key={choice}
            onPress={() => {
              onChange(choice);
            }}
          >
            {label}
          </Pill>
        ))}
      </View>
      {value === 'custom' ? (
        <Input
          label="성별 직접 입력"
          most={LONGEST_GENDER}
          onChangeText={onChangeWords}
          placeholder="직접 입력"
          value={words}
        />
      ) : null}
    </View>
  );
}

const TRACK_PADDING = 3;

const styles = StyleSheet.create({
  field: { gap: space[2] },
  track: {
    flexDirection: 'row',
    padding: TRACK_PADDING,
    borderRadius: radius.md,
    backgroundColor: color.surfaceSunken,
  },
  level: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // The track is as high as the smallest touch area.
    minHeight: size.touchMin - 2 * TRACK_PADDING,
    borderRadius: radius.md - TRACK_PADDING,
  },
  levelOn: { backgroundColor: color.surface, boxShadow: shadow.card },
  levelWords: { ...text.body, fontFamily: font.medium, color: color.inkMuted },
  levelWordsOn: { fontFamily: font.bold, color: color.snuBlue },
  // What a pill's touch area is higher than the pill, beyond the rows' own space, is taken back around the rows.
  genders: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[2], marginVertical: -PILL_ROW_GAP.choice / 2 },
});

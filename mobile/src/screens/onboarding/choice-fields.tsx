/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, shadow, size, space, text } from '@/design-system';
import type { CourseLevel } from './departments';
import { FieldLabel } from './field-label';
import type { Affiliation } from '@/api/types';
import type { GenderChoice } from './form';
import { Input } from './input';
import { Pill, PILL_ROW_GAP } from './pill';

interface SegmentFieldProps<Key extends string> {
  // What a screen reader calls the choice, and the words above it.
  label: string;
  title: string;
  choices: readonly { key: Key; label: string }[];
  // None of them, until the User chooses one.
  value: Key | null;
  onChange: (key: Key) => void;
}

// One of a few choices side by side, on one track.
function SegmentField<Key extends string>({
  label,
  title,
  choices,
  value,
  onChange,
}: SegmentFieldProps<Key>): ReactElement {
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.field}>
      <FieldLabel>{title}</FieldLabel>
      <View style={styles.track}>
        {choices.map(({ key, label: words }) => (
          <Pressable
            accessibilityLabel={words}
            accessibilityRole="radio"
            accessibilityState={{ checked: key === value }}
            aria-checked={key === value}
            key={key}
            onPress={() => {
              onChange(key);
            }}
            style={[styles.level, key === value && styles.levelOn]}
          >
            <Text style={[styles.levelWords, key === value && styles.levelWordsOn]}>{words}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const LEVELS: readonly { key: CourseLevel; label: string }[] = [
  { key: 'undergraduate', label: '학부생' },
  { key: 'graduate', label: '대학원생' },
];

// The course level: one of two, side by side.
export function CourseLevelField({
  value,
  onChange,
}: {
  value: CourseLevel;
  onChange: (level: CourseLevel) => void;
}): ReactElement {
  return <SegmentField choices={LEVELS} label="소속 과정" onChange={onChange} title="과정" value={value} />;
}

const AFFILIATIONS: readonly { key: Affiliation; label: string }[] = [
  { key: 'undergraduate', label: '학부' },
  { key: 'graduate', label: '대학원' },
  { key: 'exchange', label: '교환학생' },
];

// 소속, for the library: one of three, or none until the User chooses.
export function AffiliationField({
  value,
  onChange,
}: {
  value: Affiliation | null;
  onChange: (affiliation: Affiliation) => void;
}): ReactElement {
  return <SegmentField choices={AFFILIATIONS} label="소속" onChange={onChange} title="소속" value={value} />;
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

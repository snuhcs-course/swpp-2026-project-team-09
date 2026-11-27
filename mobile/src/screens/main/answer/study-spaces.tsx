/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Plan } from '@/api/assistant-types';
import type { StudySpot } from '@/api/study-plan-types';
import { color, font, space, text } from '@/design-system';
import { travelWords } from '@/features/assistant/answer-walks';
import { koreaClock } from '@/korea-time';
import { lengthWords } from '@/library/cards/slot-band';

// A study place opened in the meal answer's view of a Restaurant (P10 ticket 19): its line and the body in the place of
// a menu.

const MINUTE_MS = 60_000;

// "걸음 4분 · 15:50까지 2시간 30분": the way there, or the arrival when it is not known, then until when and how long the
// User can stay.
export function studyLineOf(plan: Pick<Plan, 'parts' | 'scene' | 'startAt' | 'endAt'>): string {
  const way = travelWords(plan) ?? `${koreaClock(plan.startAt)} 도착`;
  const minutes = Math.round((Date.parse(plan.endAt) - Date.parse(plan.startAt)) / MINUTE_MS);
  return `${way} · ${koreaClock(plan.endAt)}까지 ${lengthWords(minutes)}`;
}

function Space({ spot }: { spot: StudySpot }): ReactElement {
  return (
    <View style={styles.space}>
      <Text style={styles.name}>{spot.name}</Text>
      <Text style={styles.hours}>{spot.hours ?? '시간 정보 없음'}</Text>
    </View>
  );
}

// The place's spaces, best first, each by name with its hours as the main server words them.
export function StudySpaces({ spaces }: { spaces: readonly StudySpot[] }): ReactElement {
  return (
    <View style={styles.spaces} testID="study-spaces">
      {spaces.map((spot) => (
        <Space key={spot.key} spot={spot} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  spaces: { gap: space[3] },
  space: { gap: space[1] },
  name: { ...text.label, fontFamily: font.bold, color: color.ink },
  hours: { ...text.body, color: color.ink },
});

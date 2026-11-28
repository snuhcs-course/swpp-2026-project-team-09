/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SubQuest } from '@/api/types';
import { color, radius, space, text } from '@/design-system';
import { koreaClock } from '@/korea-time';

// The least each part takes: a large font makes them grow, never cuts them (the user's phone, 2026-11-28: "11:3").
const STEP_HEIGHT = 28;
const STEP_NUMBER = 22;
// What a step without a start holds, unseen, so that its title begins where the others' do: every start is "HH:MM" in
// tabular figures, as wide as this.
const NO_START = '00:00';

type Step = Pick<SubQuest, 'id' | 'title' | 'startsAt'>;

// Whether the steps only say again the card's line above them (the user's phone, 2026-11-28: "① 11:30 301동식당에서
// 식사" under "모레(월) 11:30 301동식당"): one step, at the line's time, at the place the line names.
export function onlyRepeats(steps: readonly Omit<Step, 'id'>[], startAt: string, place: string | null): boolean {
  const [only, ...rest] = steps;
  return (
    only !== undefined &&
    rest.length === 0 &&
    place !== null &&
    only.startsAt !== null &&
    Date.parse(only.startsAt) === Date.parse(startAt) &&
    only.title.startsWith(place)
  );
}

// A Quest's steps in order, each a row of three columns: its number from 1, its start, and its title.
export function QuestSteps({ steps }: { steps: readonly Step[] }): ReactElement {
  return (
    <View style={styles.steps} testID="quest-steps">
      {steps.map(({ id, title, startsAt }, index) => (
        <View key={id} style={styles.step}>
          <View style={styles.number}>
            <Text style={styles.numberLabel}>{index + 1}</Text>
          </View>
          <Text numberOfLines={1} style={[styles.start, startsAt === null && styles.unseen]}>
            {startsAt === null ? NO_START : koreaClock(startsAt)}
          </Text>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { gap: space[2] },
  step: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: STEP_HEIGHT },
  number: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: STEP_NUMBER,
    minHeight: STEP_NUMBER,
    paddingHorizontal: space[1],
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  numberLabel: { ...text.caption, color: color.onPrimary },
  start: { ...text.body, flexShrink: 0, color: color.ink, fontVariant: ['tabular-nums'] },
  unseen: { opacity: 0 },
  title: { ...text.body, flex: 1, color: color.ink },
});

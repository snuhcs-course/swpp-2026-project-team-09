/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SubQuest } from '@/api/types';
import { color, radius, space, text } from '@/design-system';
import { koreaClock } from '@/korea-time';

const STEP_HEIGHT = 28;
const STEP_NUMBER = 22;
// The start's column keeps its width without a start, so that every title begins at one edge.
const START_WIDTH = 44;

// A Quest's steps in order, each a row of three columns: its number from 1, its start, and its title.
export function QuestSteps({ steps }: { steps: readonly Pick<SubQuest, 'id' | 'title' | 'startsAt'>[] }): ReactElement {
  return (
    <View style={styles.steps} testID="quest-steps">
      {steps.map(({ id, title, startsAt }, index) => (
        <View key={id} style={styles.step}>
          <View style={styles.number}>
            <Text style={styles.numberLabel}>{index + 1}</Text>
          </View>
          <Text style={styles.start}>{startsAt === null ? '' : koreaClock(startsAt)}</Text>
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
  step: { flexDirection: 'row', alignItems: 'center', gap: space[2], height: STEP_HEIGHT },
  number: {
    alignItems: 'center',
    justifyContent: 'center',
    width: STEP_NUMBER,
    height: STEP_NUMBER,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  numberLabel: { ...text.caption, color: color.onPrimary },
  start: { ...text.body, width: START_WIDTH, color: color.ink, fontVariant: ['tabular-nums'] },
  title: { ...text.body, flex: 1, color: color.ink },
});

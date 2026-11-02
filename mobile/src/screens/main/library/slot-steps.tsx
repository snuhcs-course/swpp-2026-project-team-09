/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { color, space as spacing, text } from '@/design-system';
import { koreaDateKey } from '@/korea-time';
import type { Slot } from '@/library/cards/payloads';
import { clockOf, minutesOf, nextStart, STEP_MINUTES } from '@/library/cards/times';
import { Pill } from './library-parts';

// The time of a book card the app gave for a tapped seat: its start and its length, each by 30 minutes, within the
// space's hours and booking lengths, and never before the next 30 minutes today.

interface SlotStepsProps {
  slot: Slot;
  space: LibrarySpace;
  onChange: (slot: Slot) => void;
}

function earliest(slot: Slot, space: LibrarySpace): number {
  const open = minutesOf(space.hours.open);
  return slot.date === koreaDateKey(now()) ? Math.max(open, minutesOf(nextStart(now()))) : open;
}

interface StepRowProps {
  label: string;
  // What the step is called, before "30분 …".
  name: string;
  words: [string, string];
  can: [boolean, boolean];
  onStep: (by: number) => void;
}

// One line of steps: its value, then −30분 and +30분.
function StepRow({ label, name, words, can, onStep }: StepRowProps): ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Pill
        disabled={!can[0]}
        label="−30분"
        name={`${name} 30분 ${words[0]}`}
        onPress={() => {
          onStep(-STEP_MINUTES);
        }}
      />
      <Pill
        disabled={!can[1]}
        label="+30분"
        name={`${name} 30분 ${words[1]}`}
        onPress={() => {
          onStep(STEP_MINUTES);
        }}
      />
    </View>
  );
}

export function SlotSteps({ slot, space, onChange }: SlotStepsProps): ReactElement {
  const start = minutesOf(slot.start);
  const close = minutesOf(space.hours.close);
  const end = start + slot.minutes;
  return (
    <View style={styles.steps}>
      <StepRow
        can={[start - STEP_MINUTES >= earliest(slot, space), end + STEP_MINUTES <= close]}
        label={`시작 ${slot.start}`}
        name="시작"
        onStep={(by) => {
          onChange({ ...slot, start: clockOf(start + by) });
        }}
        words={['앞당기기', '늦추기']}
      />
      <StepRow
        can={[
          slot.minutes - STEP_MINUTES >= space.minMinutes,
          slot.minutes + STEP_MINUTES <= space.maxMinutes && end + STEP_MINUTES <= close,
        ]}
        label={`이용 ${String(slot.minutes)}분`}
        name="이용 시간"
        onStep={(by) => {
          onChange({ ...slot, minutes: slot.minutes + by });
        }}
        words={['줄이기', '늘리기']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { gap: spacing[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { ...text.label, flex: 1, color: color.ink },
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Plan, TimeBand } from '@/api/assistant-types';
import { color, radius, space, text } from '@/design-system';
import { doneWordsOf, pickedLanes, pickRowsOf } from '@/features/assistant/people-picking';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { useFriends } from '@/features/friends/use-friends';
import { BAR_ADD_HEIGHT } from './condition-chips';
import type { Picking } from './person-rows';

// The time card's head while people are picked (P04 ticket 64), in "＋ 같이"'s place: a quiet "취소" that leaves the
// Plan as it was, and "완료", which asks once with everyone checked.
export function PickHead(p: {
  done: string;
  disabled: boolean;
  onDone: () => void;
  onCancel: () => void;
}): ReactElement {
  return (
    <View style={styles.head}>
      <Pressable accessibilityRole="button" hitSlop={space[2]} onPress={p.onCancel} testID="time-card-pick-cancel">
        <Text style={styles.cancel}>취소</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: p.disabled }}
        disabled={p.disabled}
        onPress={p.onDone}
        style={({ pressed }) => [styles.done, pressed && styles.pressed]}
        testID="time-card-pick-done"
      >
        <Text style={styles.doneWords}>{p.done}</Text>
      </Pressable>
    </View>
  );
}

export interface PickingBar {
  // What the bar draws: while picking, the lanes of the checked, so that each check changes the combined bar at once.
  band: TimeBand;
  picking: Picking | null;
  // The head while picking, in "＋ 같이"'s place.
  head: ReactNode;
  // "＋ 같이", or with Friends in the Plan "같이 3 ›", which opens picking with them checked.
  addWords: string;
}

// The time card of a Plan while people are picked in it, and the add chip's words otherwise (P04 ticket 64).
export function usePickingBar(shown: ShownAnswer, plan: Plan, busy: boolean): PickingBar {
  const { data: friends = [] } = useFriends();
  const { picked, answer } = shown;
  const band = useMemo(
    () => (picked === null ? plan.band : { ...plan.band, lanes: pickedLanes(plan.band, picked) }),
    [plan.band, picked],
  );
  const others = plan.band.lanes.length - 1;
  const addWords = others > 0 ? `같이 ${String(others)} ›` : '＋ 같이';
  if (picked === null || answer === null) {
    return { band, picking: null, head: null, addWords };
  }
  const walks = new Map(plan.parts.map(({ userId, walkMinutes }) => [userId, walkMinutes]));
  return {
    band,
    picking: { rows: pickRowsOf({ band: plan.band, picked, walks, friends }), onPick: shown.pick },
    head: (
      <PickHead
        disabled={busy}
        done={doneWordsOf(answer.input, picked)}
        onCancel={() => {
          shown.setAdding(false);
        }}
        onDone={shown.finishPicking}
      />
    ),
    addWords,
  };
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  cancel: { ...text.label, color: color.inkMuted },
  done: {
    justifyContent: 'center',
    height: BAR_ADD_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  pressed: { opacity: 0.6 },
  doneWords: { ...text.label, color: color.onPrimary },
});

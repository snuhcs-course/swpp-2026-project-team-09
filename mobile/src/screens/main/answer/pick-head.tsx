/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Plan, TimeBand } from '@/api/assistant-types';
import { color, radius, space, text } from '@/design-system';
import { metresBetween } from '@/features/assistant/answer-drawing';
import { doneWordsOf, pickedLanes, pickRowsOf, previewOf, walkGuessOf } from '@/features/assistant/people-picking';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { useFriends } from '@/features/friends/use-friends';
import { BAR_ADD_HEIGHT } from './condition-chips';
import type { Picking } from './person-rows';

// The time card's head while people are picked (P04 ticket 64), in "＋ 같이"'s place: a quiet "취소" that leaves the
// Plan as it was, and "완료", which asks once with everyone checked; "닫기" alone with no Friend to pick (boards p2–p5,
// p20).
export function PickHead(p: {
  done: string;
  disabled: boolean;
  onDone: () => void;
  onCancel: () => void;
}): ReactElement {
  return (
    <View style={styles.head}>
      {p.done === '닫기' ? null : (
        <Pressable accessibilityRole="button" hitSlop={space[2]} onPress={p.onCancel} testID="time-card-pick-cancel">
          <Text style={styles.cancel}>취소</Text>
        </Pressable>
      )}
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

// 완료: one recalculation with everyone checked. A meet needs a Friend: one left with none checked goes back to the card
// of the Friend it was made with, as the last ✕ did.
function finishOf(shown: ShownAnswer, onClose: () => void): () => void {
  return () => {
    const { answer, picked } = shown;
    const first = answer?.input.kind === 'meet' ? (answer.input.people[1]?.userId ?? null) : null;
    if (first !== null && picked?.length === 0) {
      onClose();
      router.setParams({ person: first });
      return;
    }
    shown.finishPicking();
  };
}

// The time card of a Plan while people are picked in it, and the add chip's words otherwise (P04 ticket 64): the bar
// draws the checked people's lanes and the span they leave (`previewOf`); a Friend the main server sent no lane for
// is placed by the phone's guess of their walk.
export function usePickingBar(
  shown: ShownAnswer,
  plan: Plan,
  { busy, onClose }: { busy: boolean; onClose: () => void },
): PickingBar {
  const { data: friends = [] } = useFriends();
  const { picked, answer } = shown;
  const band = useMemo(() => {
    if (picked === null) {
      return plan.band;
    }
    const lanes = pickedLanes(plan.band, picked);
    return { ...plan.band, lanes, ...previewOf(plan.band, lanes) };
  }, [plan.band, picked]);
  const others = plan.band.lanes.length - 1;
  const addWords = others > 0 ? `같이 ${String(others)} ›` : '＋ 같이';
  if (picked === null || answer === null) {
    return { band, picking: null, head: null, addWords };
  }
  const walks = new Map(plan.parts.map(({ userId, walkMinutes }) => [userId, walkMinutes]));
  const guessed = friends.map(({ id, name, position }) => ({
    id,
    name,
    walkMinutes: walkGuessOf(position === null ? null : metresBetween(position, plan.place)),
  }));
  const leave = (): void => {
    shown.setAdding(false);
  };
  return {
    band,
    picking: { rows: pickRowsOf({ band: plan.band, picked, walks, friends: guessed }), onPick: shown.pick },
    head: (
      <PickHead
        disabled={busy}
        done={doneWordsOf(picked, friends.length)}
        onCancel={leave}
        onDone={friends.length === 0 ? leave : finishOf(shown, onClose)}
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

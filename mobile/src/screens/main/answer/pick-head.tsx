/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, type ReactNode, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TimeBand } from '@/api/assistant-types';
import { color, font, radius, space, text } from '@/design-system';
import { metresBetween } from '@/features/assistant/answer-drawing';
import type { Frame } from '@/features/assistant/answer-frame';
import {
  doneWordsOf,
  inOrder,
  openOrderOf,
  pickedLanes,
  type PickRow,
  pickRowsOf,
  previewOf,
  walkGuessOf,
} from '@/features/assistant/people-picking';
import type { Stretch } from '@/features/assistant/time-band';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { FriendView } from '@/features/friends/adapter';
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
  // The Friends in the Plan, whom "같이 3 ›" counts; none for "＋ 같이".
  inPlan: number;
}

// 완료: one recalculation with everyone checked. An answer asked from a card goes back to that card once every Friend is
// out of it, with no request (`toCard`, P10 ticket 15). A meet needs a Friend: one left with none checked goes back to
// the card of the Friend it was made with, as the last ✕ did.
function finishOf(shown: ShownAnswer, onClose: () => void, toCard: (() => void) | null): () => void {
  return () => {
    const { answer, picked } = shown;
    if (toCard !== null && picked?.length === 0) {
      shown.setAdding(false);
      toCard();
      return;
    }
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
// The rows while picking, before their order (`useOpenOrder`): each Friend with the walk the Plan or `others` gives, or
// the phone's guess from where the Friend is.
function rowsOf(frame: Frame, picked: readonly string[], friends: readonly FriendView[]): PickRow[] {
  const { place } = frame;
  const walks = new Map(frame.parts.map(({ userId, walkMinutes }) => [userId, walkMinutes]));
  const guessed = friends.map(({ id, name, department, position }) => ({
    id,
    name,
    department,
    walkMinutes: walkGuessOf(position === null || place === null ? null : metresBetween(position, place)),
  }));
  return pickRowsOf({ band: frame.band, picked, walks, friends: guessed });
}

// The rows in the order worked out as picking opened, which the answer's state keeps until it ends, so that a check
// never moves a row and the keyboard, which takes the card away a while, does not reorder them (the user's phone,
// 2026-11-25). Only the rows of that order show, so that they never grow once open (P04 ticket 67).
function useOpenOrder(
  source: Pick<PickSource, 'pickOrder' | 'keepPickOrder'>,
  rows: PickRow[] | null,
): PickRow[] | null {
  const { pickOrder, keepPickOrder } = source;
  const order = rows === null ? null : (pickOrder ?? openOrderOf(rows));
  useEffect(() => {
    if (order !== null && pickOrder === null) {
      keepPickOrder(order);
    }
  }, [order, pickOrder, keepPickOrder]);
  return rows === null || order === null ? null : inOrder(rows, order);
}

// The User's Friends with the positions their walks are guessed from, or null while the list is on its way, so that
// no row shows before all of them can (P04 ticket 67). A list that failed leaves the rows of the answer alone.
function useListedFriends(): readonly FriendView[] | null {
  const { data, isError } = useFriends();
  return data ?? (isError ? [] : null);
}

// Who picks people in a time card: the answer on screen, or the seat answer's "＋ 같이" (P10 ticket 15), whose
// picking the card keeps itself. Both draw the same rows and head, and 완료 is given the span the bar shows.
export interface PickSource {
  picked: readonly string[] | null;
  asked: readonly string[] | null;
  // Whether there is a card to pick in: the answer on screen, or the seat card.
  ready: boolean;
  pickOrder: readonly string[] | null;
  keepPickOrder: (order: readonly string[]) => void;
  pick: (userId: string) => void;
  setAdding: (open: boolean) => void;
  // 완료.
  finish: (shown: Stretch) => void;
}

// `toCard`, the way back to the card an answer was asked from, or null.
export function answerPickSource(shown: ShownAnswer, onClose: () => void, toCard: (() => void) | null): PickSource {
  return {
    picked: shown.picked,
    asked: shown.asked,
    ready: shown.answer !== null,
    pickOrder: shown.pickOrder,
    keepPickOrder: shown.keepPickOrder,
    pick: shown.pick,
    setAdding: shown.setAdding,
    finish: finishOf(shown, onClose, toCard),
  };
}

export function usePickingBar(source: PickSource, plan: Frame, { busy }: { busy: boolean }): PickingBar {
  const friends = useListedFriends();
  const { picked, ready, asked } = source;
  // From 완료 until its answer, the bar shows what was asked for, not the answer before it.
  const people = picked ?? asked;
  const band = useMemo(() => {
    if (people === null) {
      return plan.band;
    }
    const lanes = pickedLanes(plan.band, people);
    return { ...plan.band, lanes, ...previewOf(plan.band, lanes) };
  }, [plan.band, people]);
  const others = asked === null ? plan.band.lanes.length - 1 : asked.length;
  const waiting = picked === null || !ready || friends === null;
  const rows = useOpenOrder(source, waiting ? null : rowsOf(plan, picked, friends));
  if (picked === null || !ready || rows === null) {
    return { band, picking: null, head: null, inPlan: others };
  }
  const leave = (): void => {
    source.setAdding(false);
  };
  return {
    band,
    picking: { rows, onPick: source.pick },
    head: (
      <PickHead
        disabled={busy}
        done={doneWordsOf(rows.length)}
        onCancel={leave}
        onDone={
          rows.length === 0
            ? leave
            : () => {
                source.finish(band);
              }
        }
      />
    ),
    inPlan: others,
  };
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  cancel: { ...text.label, fontFamily: font.medium, color: color.inkMuted },
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

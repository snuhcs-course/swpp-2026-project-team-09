/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { color, radius, shadow, space } from '@/design-system';
import { windowOf } from '@/features/assistant/plan-input';
import { bandIsFixed } from '@/features/assistant/row-four-inputs';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { koreaDayWord } from '@/korea-time';
import { ANSWER_PILL, listsTop } from '../layout';
import { MealTick, mealDayOf, mealTickOf } from './meal-tick';
import { TimeBand } from './time-band';
import { type BandFocus, useCorrections } from './use-corrections';

const NO_WINDOW = { from: null, until: null };

function ignoreDrop(): void {
  // A Lookup's band has no handles.
}

// Under the pill, by the pill's own gap.
export function barTop(inset: number): number {
  return listsTop(inset) + ANSWER_PILL.height + space[2];
}

type BandProps = Parameters<typeof TimeBand>[0];

interface BarProps {
  band: Omit<BandProps, 'folded' | 'day'>;
  // The words before the span's; left out, its day word.
  day?: string;
  onHeight: (height: number) => void;
}

// The time bar: the answer's band in one white row under the pill, folded to one row, which a press on its grip
// unfolds to a row for each person when there is more than one, and folds again.
function Bar({ band, day, onHeight }: BarProps): ReactElement {
  const { top } = useSafeAreaInsets();
  const [unfolded, setUnfolded] = useState(false);
  const { lanes, startAt, now } = band.band;
  // One lane has nothing to unfold, also once a Friend was taken out while the bar was unfolded.
  const folded = !unfolded || lanes.length < 2;
  const label = folded ? '사람별 시간 펼치기' : '사람별 시간 접기';
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        onHeight(nativeEvent.layout.height);
      }}
      style={[styles.bar, { top: barTop(top) }]}
      testID="time-bar"
    >
      <TimeBand {...band} day={day ?? koreaDayWord(startAt, new Date(now))} folded={folded} />
      {lanes.length > 1 ? (
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityState={{ expanded: !folded }}
          hitSlop={space[2]}
          onPress={() => {
            setUnfolded(folded);
          }}
          style={styles.toggle}
        >
          <View style={styles.grip} />
        </Pressable>
      ) : null}
    </View>
  );
}

interface PlanBarProps {
  shown: ShownAnswer;
  answer: AnswerReply;
  plan: Plan;
  invitation: PlanInvitation;
  focus: BandFocus;
  onClose: () => void;
  onHeight: (height: number) => void;
}

// The bar of the Plan on screen: its handles and its lanes move it as the card's band did, unless the answer's kind
// fixes the time. A meal's names the meal with its day when it is not under way today, and the day's other meal
// stands at one end (`MealTick`).
export function PlanBar({ shown, answer, plan, invitation, focus, onClose, onHeight }: PlanBarProps): ReactElement {
  const fix = useCorrections(shown, answer.input, onClose, focus);
  const fixed = bandIsFixed(answer.input.kind);
  const tick = mealTickOf(answer);
  return (
    <Bar
      band={{
        tick: tick === null ? undefined : { side: tick.side, node: <MealTick shown={shown} words={tick.words} /> },
        band: plan.band,
        disabled: shown.recalculating || invitation.sending,
        fixed: windowOf(answer.input),
        focus: fix.focus,
        ghost: shown.ghost,
        handles: !fixed,
        moving: shown.moving,
        onDrop: fix.drop,
        onMove: fixed ? undefined : fix.move,
      }}
      day={mealDayOf(answer, plan)}
      onHeight={onHeight}
    />
  );
}

// A Lookup's bar, whose band has no handles: a Lookup is not recalculated by a drag.
export function LookupBar({
  lookup,
  onHeight,
}: {
  lookup: Lookup;
  onHeight: (height: number) => void;
}): ReactElement | null {
  return lookup.band === null ? null : (
    <Bar
      band={{
        band: lookup.band,
        disabled: true,
        fixed: NO_WINDOW,
        focus: null,
        ghost: null,
        handles: false,
        onDrop: ignoreDrop,
      }}
      onHeight={onHeight}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    right: ANSWER_PILL.side,
    left: ANSWER_PILL.side,
    paddingTop: space[3],
    paddingHorizontal: space[4],
    paddingBottom: space[2],
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  toggle: { alignItems: 'center', paddingTop: space[2] },
  grip: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: color.border },
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import { questsQuery } from '@/api/queries';
import type { Quest } from '@/api/types';
import { fixedOnDay } from '@/features/assistant/booking-day';
import { spanOf } from '@/library/cards/slot-band';
import type { Lookup } from '@/api/lookup-types';
import { color, radius, shadow, space } from '@/design-system';
import { windowOf } from '@/features/assistant/plan-input';
import { bandIsFixed } from '@/features/assistant/row-four-inputs';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { koreaDayWord } from '@/korea-time';
import type { ShownBooking } from '@/features/assistant/booking-scene';
import type { Chat } from '@/features/assistant/use-chat';
import { bookingKept } from '../library/booking-kept';
import { SlotBand } from '../library/slot-band';
import { AddChip, BAR_ADD_HEIGHT } from './condition-chips';
import { MealTick, mealDayOf, mealTickOf } from './meal-tick';
import { TimeBand } from './time-band';
import { type BandFocus, useCorrections } from './use-corrections';
import { addNameOf } from './who-words';

const NO_WINDOW = { from: null, until: null };
const NO_QUESTS: readonly Quest[] = [];
// The grip takes a press 44 high around its middle only, so that the ends' labels, the day's other meal among them,
// keep their own presses.
const GRIP_WIDTH = 72;
const GRIP_SLOP = { top: 16, bottom: 16, left: space[2], right: space[2] };
// The words' room at the right while "＋ 같이" stands there, until the chip is laid out: its width on a phone at the
// usual text size. Laid out, the chip's own width is the room, so that a larger text size widens both (P04 ticket 37):
// the chip stands 12 from the bar's edge, 4 short of the bar's padding of 16, which is the gap before the words.
const ADD_ROOM = 72;

function ignoreDrop(): void {
  // A Lookup's band has no handles.
}

// The bar is the answer's top sheet (P04 ticket 52): full width from the screen's top edge, its background under the
// status bar `inset` high and its content below it, only its bottom corners rounded, as the bottom sheet's top ones.
// Under another sheet `offset` high (several requests' steps), it stands attached to that one.
export function sheetPlace(inset: number, offset = 0): { top: number; paddingTop: number } {
  return { top: offset - inset, paddingTop: (offset === 0 ? inset : 0) + space[3] };
}

type BandProps = Parameters<typeof TimeBand>[0];

interface BarProps {
  band: Omit<BandProps, 'folded' | 'day'>;
  // The words before the span's; left out, its day word.
  day?: string;
  // "＋ 같이" at the right end of the words row (P04 ticket 14); left out, none.
  add?: ReactNode;
  onHeight: (height: number) => void;
  // How far below its place under the pill it stands, under the bar of several requests (P04 ticket 09); left out, 0.
  offset?: number;
}

// The time bar: the answer's band in one white row at the top, its head the words and "＋ 같이", folded to one row, which a press on its grip
// unfolds to the band's whole range, a row for each person, and folds again.
function Bar({ band, day, add = null, onHeight, offset = 0 }: BarProps): ReactElement {
  const { top } = useSafeAreaInsets();
  const [unfolded, setUnfolded] = useState(false);
  const [addWidth, setAddWidth] = useState(ADD_ROOM);
  const { lanes, startAt, now } = band.band;
  // Folded, the track runs over the free time around the span (P04 ticket 14); every bar unfolds to the band's whole
  // range, a bar of one lane too, so that a move further away is made there (PR 465's review).
  const folded = !unfolded;
  const what = lanes.length > 1 ? '사람별 시간' : '하루 시간';
  const label = folded ? `${what} 펼치기` : `${what} 접기`;
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        onHeight(nativeEvent.layout.height);
      }}
      style={[styles.bar, sheetPlace(top, offset)]}
      testID="time-bar"
    >
      <TimeBand
        {...band}
        day={day ?? koreaDayWord(startAt, new Date(now))}
        folded={folded}
        head={{ right: add === null ? 0 : addWidth, height: BAR_ADD_HEIGHT }}
      />
      {add === null ? null : (
        <View
          onLayout={({ nativeEvent }: LayoutChangeEvent) => {
            setAddWidth(Math.ceil(nativeEvent.layout.width));
          }}
          style={[styles.add, { top: sheetPlace(top, offset).paddingTop }]}
          testID="time-bar-add"
        >
          {add}
        </View>
      )}
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: !folded }}
        hitSlop={GRIP_SLOP}
        onPress={() => {
          setUnfolded(folded);
        }}
        style={styles.toggle}
      >
        <View style={styles.grip} />
      </Pressable>
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
  offset?: number;
}

// The bar of the Plan on screen: its handles and its lanes move it as the card's band did, unless the answer's kind
// fixes the time. A meal's names the meal with its day when it is not under way today, and the day's other meal
// stands at one end (`MealTick`). "＋ 같이" stands at the right of its words, beside the rows people belong with, while
// the Plan can take more people (P04 ticket 14), so that the dock is the input's row alone.
export function PlanBar(props: PlanBarProps): ReactElement {
  const { shown, answer, plan, invitation, focus, onClose, onHeight, offset } = props;
  const fix = useCorrections(shown, answer.input, onClose, focus);
  const settled = invitation.made !== null || invitation.changed !== null || invitation.left !== null;
  const addName = !settled && (fix.adding || fix.choices.length > 0) ? addNameOf(answer.input.kind) : null;
  const busy = shown.recalculating || invitation.sending || invitation.changing;
  // A meeting changed in place (P04 ticket 17) is set: its band is read, not moved.
  const fixed = bandIsFixed(answer.input.kind) || invitation.changed !== null;
  const tick = mealTickOf(answer);
  const sent = invitation.sending || invitation.made !== null;
  return (
    <Bar
      band={{
        tick:
          tick === null
            ? undefined
            : { side: tick.side, node: <MealTick sent={sent} shown={shown} words={tick.words} /> },
        band: plan.band,
        disabled: busy,
        fixed: windowOf(answer.input),
        focus: fix.focus,
        ghost: shown.ghost,
        handles: !fixed,
        moving: shown.moving,
        onDrop: fix.drop,
        onMove: fixed ? undefined : fix.move,
      }}
      add={
        addName === null ? null : (
          <AddChip adding={fix.adding} disabled={busy} inBar name={addName} onAdd={fix.toggleAdding} />
        )
      }
      day={mealDayOf(answer, plan)}
      onHeight={onHeight}
      offset={offset}
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

// A booking's bar (P04 ticket 07): the seat card's band, whose handles change the start and the end the chat keeps for
// the card, within the space's hours, steps, and lengths, as they did in the card. While a booking is on its way the
// band is hidden, as the card's was, so that the time stays as it was booked.
export function BookingBar({
  booking,
  chat,
  onHeight,
}: {
  booking: ShownBooking;
  chat: Pick<Chat, 'rooms' | 'showRoom' | 'outcomes'>;
  onHeight: (height: number) => void;
}): ReactElement | null {
  const { top } = useSafeAreaInsets();
  const { kept, keep, live } = bookingKept(booking, chat);
  const pending = chat.outcomes.get(booking.place)?.kind === 'pending';
  // The User's Classes and Quests of the slot's date, which the band shows and names (P01 ticket 05).
  const quests = useQuery(questsQuery).data ?? NO_QUESTS;
  return live === null || pending || booking.booked ? null : (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        onHeight(nativeEvent.layout.height);
      }}
      style={[styles.bar, sheetPlace(top)]}
      testID="time-bar"
    >
      <SlotBand
        onChange={(slot) => {
          keep({ slot });
        }}
        day={fixedOnDay(quests, live.date, spanOf(live))}
        slot={live}
        space={kept.space}
        wordsFirst
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    right: 0,
    left: 0,
    paddingHorizontal: space[4],
    paddingBottom: space[2],
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.sheet,
  },
  toggle: { alignSelf: 'center', alignItems: 'center', width: GRIP_WIDTH, paddingTop: space[2] },
  grip: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: color.border },
  // At the right of the head row, its top at the row's top (the bar's padding), so that the two share their middle and
  // the track starts below both (P04 ticket 45).
  add: { position: 'absolute', right: space[4] },
});

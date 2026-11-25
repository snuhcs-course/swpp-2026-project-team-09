/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
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
import { ANSWER_TOP, listsTop } from '../layout';
import type { ShownBooking } from '@/features/assistant/booking-scene';
import type { Chat } from '@/features/assistant/use-chat';
import { bookingKept } from '../library/booking-kept';
import { SlotBand } from '../library/slot-band';
import { AddChip, BAR_ADD_HEIGHT } from './condition-chips';
import { MealTick, mealDayOf, mealTickOf } from './meal-tick';
import { PersonRows } from './person-rows';
import { TimeBand } from './time-band';
import { type TimeCardGrip, useTimeCardGrip } from './time-card-grip';
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
// The grip's name alone, where it opens nothing.
const GRIP_ALONE = '시간 카드 손잡이';

function ignoreDrop(): void {
  // A Lookup's band has no handles.
}

// In the lists' place, where the round "←" stands when there is no bar (the 2026-11-22 redesign).
export function barTop(inset: number): number {
  return listsTop(inset);
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

// The bar's grip: a drag moves the card between tucked, its place, and with Friends open (`useTimeCardGrip`); a press
// opens it or folds it again, and a screen reader tucks it away or back. Alone (`label` null) it only tucks.
function Grip(p: { grip: TimeCardGrip; label: string | null; folded: boolean }): ReactElement {
  const { grip, label, folded } = p;
  return (
    <GestureDetector gesture={grip.pan}>
      <Pressable
        accessibilityActions={grip.actions}
        accessibilityLabel={label ?? GRIP_ALONE}
        accessibilityRole={label === null ? undefined : 'button'}
        accessibilityState={label === null ? undefined : { expanded: !folded }}
        hitSlop={GRIP_SLOP}
        onAccessibilityAction={({ nativeEvent }) => {
          grip.onAction(nativeEvent.actionName);
        }}
        onPress={label === null ? undefined : grip.toggle}
        style={styles.toggle}
        testID="time-card-grip"
      >
        <View style={styles.grip} />
      </Pressable>
    </GestureDetector>
  );
}

// The rows for each person under the open card, in the room that grows as the card is pulled open.
function OpenRows(p: { band: BarProps['band']; grip: TimeCardGrip; onHeight: (height: number) => void }): ReactElement {
  const { band, grip } = p;
  const folded = grip.place !== 'open';
  return (
    <Reanimated.View style={[styles.grown, grip.grown, grip.grownRest]}>
      <PersonRows
        band={band.band}
        fixed={band.fixed}
        hidden={folded}
        moving={band.moving ?? null}
        onHeight={p.onHeight}
        shown={{ startAt: band.band.startAt, endAt: band.band.endAt }}
      />
    </Reanimated.View>
  );
}

// The time bar: the answer's band in one white row at the top, its head the words and "＋ 같이", its track over the
// free time around the span, at one range and scale whether it is open or not. With Friends, pulled open by its grip, a
// row for each person comes out under the track over the same range (P04 ticket 61). A time outside that range is
// reached by asking in the chat, not by a drag. Its grip also pushes it up out of the way. The height it tells is its
// folded one: open, it lies over the map for a while.
function Bar({ band, day, add = null, onHeight, offset = 0 }: BarProps): ReactElement {
  const { top } = useSafeAreaInsets();
  const [addWidth, setAddWidth] = useState(ADD_ROOM);
  const [height, setHeight] = useState(0);
  const [rows, setRows] = useState(0);
  const barY = barTop(top) + offset;
  const { lanes, startAt, now } = band.band;
  const friends = lanes.length > 1;
  const grip = useTimeCardGrip({ height, top: barY, opens: friends, rows });
  const folded = !friends || grip.place !== 'open';
  const label = friends ? `사람별 시간 ${folded ? '펼치기' : '접기'}` : null;
  return (
    <Reanimated.View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        if (!grip.moving) {
          const own = nativeEvent.layout.height - (folded ? 0 : rows);
          setHeight(own);
          onHeight(own);
        }
      }}
      style={[styles.bar, { top: barY }, grip.moved, grip.rested]}
      testID="time-bar"
    >
      <TimeBand
        {...band}
        day={day ?? koreaDayWord(startAt, new Date(now))}
        folded
        head={{ right: add === null ? 0 : addWidth, height: BAR_ADD_HEIGHT }}
      />
      {friends ? <OpenRows band={band} grip={grip} onHeight={setRows} /> : null}
      {add === null ? null : (
        <View
          onLayout={({ nativeEvent }: LayoutChangeEvent) => {
            setAddWidth(Math.ceil(nativeEvent.layout.width));
          }}
          style={styles.add}
          testID="time-bar-add"
        >
          {add}
        </View>
      )}
      <Grip folded={folded} grip={grip} label={label} />
    </Reanimated.View>
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
      style={[styles.bar, { top: barTop(top) }]}
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
    right: ANSWER_TOP.side,
    left: ANSWER_TOP.side,
    paddingTop: space[3],
    paddingHorizontal: space[4],
    paddingBottom: space[2],
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  // The rows' room, which grows as the card is pulled open.
  grown: { overflow: 'hidden' },
  toggle: { alignSelf: 'center', alignItems: 'center', width: GRIP_WIDTH, paddingTop: space[2] },
  grip: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: color.border },
  // At the right of the head row, its top at the row's top (the bar's padding), so that the two share their middle and
  // the track starts below both (P04 ticket 45).
  add: { position: 'absolute', top: space[3], right: space[3] },
});

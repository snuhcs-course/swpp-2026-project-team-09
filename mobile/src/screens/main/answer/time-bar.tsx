/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, use, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { AnswerReply, LibrarySpace, Plan } from '@/api/assistant-types';
import { questsQuery } from '@/api/queries';
import type { Quest } from '@/api/types';
import type { Lookup } from '@/api/lookup-types';
import { radius, space } from '@/design-system';
import { windowOf, withoutSkipped } from '@/features/assistant/plan-input';
import { bandIsFixed } from '@/features/assistant/row-four-inputs';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { koreaDayWord } from '@/korea-time';
import type { Slot } from '@/library/cards/payloads';
import { ANSWER_TOP, listsTop } from '../layout';
import type { ShownBooking } from '@/features/assistant/booking-scene';
import type { Chat } from '@/features/assistant/use-chat';
import { bookingKept } from '../library/booking-kept';
import { useBookingBand } from './booking-band';
import { AddChip, BAR_ADD_HEIGHT } from './condition-chips';
import { mealDayOf } from './meal-day';
import { type Picking, PersonRows } from './person-rows';
import { answerPickSource, usePickingBar } from './pick-head';
import { usePickingPlace } from './picking-place';
import { useSeatTogether } from './seat-picking';
import { PickHint } from './sheet-hint';
import { useFoldedHeight } from './folded-height';
import { SheetLinkContext } from './sheet-link';
import { TimeBand } from './time-band';
import { type TimeCardGrip, useTimeCardGrip } from './time-card-grip';
import { CARD_FACE, Caret, Grip, STRIP_TOP } from './time-card-strip';
import { type BandFocus, useCorrections } from './use-corrections';
import { addNameOf } from './who-words';
import { restingLift, type TopStops } from './top-stops';

const NO_WINDOW = { from: null, until: null };
const NO_QUESTS: readonly Quest[] = [];
// The words' room at the right while "＋ 같이" stands there, until the chip is laid out: its width on a phone at the
// usual text size. Laid out, the chip's own width is the room, so that a larger text size widens both (P04 ticket 37):
// the chip stands 12 from the bar's edge, 4 short of the bar's padding of 16, which is the gap before the words.
const ADD_ROOM = 72;

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
  // Under the bar of several requests, where the chosen step's span is centred on that bar, as a share of its range: a
  // caret on the card's top edge points there (P01 ticket 23). Left out, none.
  caret?: number;
  // People are picked in its rows (P04 ticket 64), which opens it.
  picking?: Picking | null;
}

// The rows for each person under the open card, in the room that grows as the card is pulled open.
function OpenRows(p: {
  band: BarProps['band'];
  grip: TimeCardGrip;
  picking: Picking | null;
  onHeight: (height: number) => void;
}): ReactElement {
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
        picking={p.picking}
        shown={{ startAt: band.band.startAt, endAt: band.band.endAt }}
      />
    </Reanimated.View>
  );
}

// The time bar: the answer's band in one white row at the top, its head the words and "＋ 같이", its track over the
// free time around the span, at one range and scale whether it is open or not. Pulled open by its grip, a row for each
// person comes out under the track over the same range, 나's alone when nobody is added, four people at most in sight
// and the rest scrolled to (P04 ticket 61); people are picked in those rows (P04 ticket 64). A time outside that range
// is asked for in the chat, not by a drag. Its grip also pushes it up out of the way. The height it tells is its
// folded one: open, it lies over the map for a while.
// Under the bar of several requests it is the top's last card (P01 ticket 22): it folds behind that bar, then takes the
// bar up to the stage's top, its grip strip showing all the way (`top-stops.tsx`).
function Bar(props: BarProps): ReactElement {
  const sheet = use(SheetLinkContext);
  return <TimeCard {...props} under={(props.offset ?? 0) > 0 ? sheet.top : undefined} />;
}

// Under the bar of several requests the card stands in a frame that starts inside that bar, under its rounded top, and
// moves with the bar's lift: no part of the card ever shows above the bar, however tall it is (the fault P01 ticket 22
// removes), and past its place behind the bar it goes up with the bar.
function UnderFrame({ under, children }: { under: TopStops; children: ReactNode }): ReactElement {
  const { top } = useSafeAreaInsets();
  const { lift } = under;
  const moved = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const rested = { transform: [{ translateY: restingLift(under.stop, barTop(top) + under.stepsHeight) }] };
  return (
    <Reanimated.View style={[styles.frame, { top: frameTop(top) }, moved, rested]} testID="time-card-frame">
      {children}
    </Reanimated.View>
  );
}

// "＋ 같이" at the right of the head's row, which tells its width so that the words leave it room.
function AddSlot({ add, onWidth }: { add: ReactNode; onWidth: (width: number) => void }): ReactElement {
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        onWidth(Math.ceil(nativeEvent.layout.width));
      }}
      style={styles.add}
      testID="time-bar-add"
    >
      {add}
    </View>
  );
}

function frameTop(inset: number): number {
  return barTop(inset) + radius.xl;
}

function TimeCard({
  band,
  day,
  add = null,
  onHeight,
  offset = 0,
  caret,
  picking = null,
  under,
}: BarProps & { under: TopStops | undefined }): ReactElement {
  const { top } = useSafeAreaInsets();
  const [addWidth, setAddWidth] = useState(ADD_ROOM);
  const [rows, setRows] = useState(0);
  const { height, onBand, onStrip } = useFoldedHeight(STRIP_TOP, onHeight);
  const barY = barTop(top) + offset;
  const { startAt, now } = band.band;
  const sheet = use(SheetLinkContext);
  const grip = useTimeCardGrip({ height, top: barY, rows, sheet, under });
  usePickingPlace(picking !== null, grip, sheet.high);
  const card = (
    <Reanimated.View
      style={[styles.bar, { top: under === undefined ? barY : barY - frameTop(top) }, grip.moved, grip.rested]}
      testID="time-bar"
    >
      <View style={styles.face} testID="time-card-face">
        <View onLayout={onBand} testID="time-card-head">
          <TimeBand
            {...band}
            day={day ?? koreaDayWord(startAt, new Date(now))}
            folded
            head={{ right: add === null ? 0 : addWidth, height: BAR_ADD_HEIGHT }}
          />
        </View>
        <OpenRows band={band} grip={grip} onHeight={setRows} picking={picking} />
        {add === null ? null : <AddSlot add={add} onWidth={setAddWidth} />}
        <Grip folded={grip.place !== 'open'} grip={grip} onLayout={onStrip} />
        {picking === null ? null : <PickHint friends={picking.rows.length > 1} />}
      </View>
      {caret === undefined ? null : <Caret at={caret} />}
    </Reanimated.View>
  );
  return under === undefined ? card : <UnderFrame under={under}>{card}</UnderFrame>;
}

interface PlanBarProps {
  shown: ShownAnswer;
  answer: AnswerReply;
  // The Plan on screen, or the frame an answer with no Plan keeps (P01 ticket 31).
  plan: Pick<Plan, 'band' | 'parts'> & { place: Plan['place'] | null };
  invitation: PlanInvitation;
  focus: BandFocus;
  onClose: () => void;
  onHeight: (height: number) => void;
  offset?: number;
  caret?: number;
  // The way back to the card the answer was asked from, or null (P10 ticket 15).
  toCard?: (() => void) | null;
}

// The bar of the Plan on screen: its handles and its lanes move it as the card's band did, unless the answer's kind
// fixes the time. A meal's names the meal with its day when it is not under way today; the day's other meal is asked
// for in words (P04 ticket 82). "＋ 같이" stands at the right of its words, beside the rows people belong with, while
// the Plan can take more people (P04 ticket 14), so that the dock is the input's row alone.
export function PlanBar(props: PlanBarProps): ReactElement {
  const { shown, answer, plan, invitation, focus, onClose, onHeight, offset, caret, toCard = null } = props;
  const fix = useCorrections(shown, answer.input, onClose, focus);
  const settled = invitation.made !== null || invitation.changed !== null || invitation.left !== null;
  const addName = settled ? null : addNameOf(answer.input.kind);
  // A held answer's band stays as it is too (P10 ticket 12): nothing it asks would be asked.
  const busy = shown.recalculating || shown.locked || invitation.sending || invitation.changing;
  // A meeting changed in place (P04 ticket 17) is set: its band is read, not moved.
  const fixed = bandIsFixed(answer.input.kind) || invitation.changed !== null;
  const pickingBar = usePickingBar(answerPickSource(shown, onClose, toCard), plan, { busy });
  return (
    <Bar
      picking={pickingBar.picking}
      band={{
        band: pickingBar.band,
        disabled: busy,
        fixed: windowOf(answer.input),
        focus: fix.focus,
        handles: !fixed,
        moving: shown.moving,
        onDrop: fix.drop,
        onMove: fixed ? undefined : fix.move,
        onPutBack: settled
          ? undefined
          : (classId) => {
              shown.change((input) => withoutSkipped(input, classId));
            },
      }}
      add={
        pickingBar.head ??
        (addName === null ? null : (
          <AddChip disabled={busy} inBar name={addName} onAdd={fix.toggleAdding} inPlan={pickingBar.inPlan} />
        ))
      }
      day={mealDayOf(answer, plan)}
      onHeight={onHeight}
      offset={offset}
      caret={caret}
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
        handles: false,
        onDrop: ignoreDrop,
      }}
      onHeight={onHeight}
    />
  );
}

// A booking's bar (P04 ticket 07): the time card a meal's answer draws, with the seat card's band, whose handles change
// the start and the end the chat keeps for the card within the room's hours, steps, and lengths (P01 ticket 14). Its
// "＋ 같이" is the answers' own, chip and picker (P10 ticket 15). While a booking is on its way the bar is hidden, so
// that the time stays as it was booked.
export function BookingBar({
  booking,
  chat,
  onHeight,
}: {
  booking: ShownBooking;
  chat: Pick<Chat, 'rooms' | 'showRoom' | 'outcomes' | 'askApp' | 'waiting'>;
  onHeight: (height: number) => void;
}): ReactElement | null {
  const { kept, keep, live } = bookingKept(booking, chat);
  const pending = chat.outcomes.get(booking.place)?.kind === 'pending';
  // The User's Classes and Quests of the slot's date, which the band shows and names (P01 ticket 05).
  const quests = useQuery(questsQuery).data ?? NO_QUESTS;
  return live === null || pending || booking.booked ? null : (
    <BookingCard
      // A new answer's card sets its range anew (P01 ticket 17).
      key={booking.place}
      chat={chat}
      keep={(slot) => {
        keep({ slot });
      }}
      onHeight={onHeight}
      quests={quests}
      slot={live}
      space={kept.space}
    />
  );
}

function BookingCard(p: {
  slot: Slot;
  space: LibrarySpace;
  quests: readonly Quest[];
  keep: (slot: Slot) => void;
  chat: Pick<Chat, 'askApp' | 'waiting'>;
  onHeight: (height: number) => void;
}): ReactElement {
  const band = useBookingBand(p.slot, p.space, p.quests, p.keep);
  const together = useSeatTogether(p.space, band.band, p.chat);
  return (
    <Bar add={together.add} band={{ ...band, band: together.band }} onHeight={p.onHeight} picking={together.picking} />
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', right: 0, bottom: 0, left: 0, overflow: 'hidden', pointerEvents: 'box-none' },
  // The card's place, which moves; its face is inside, and the caret over the face's top edge beside it, outside both
  // bounds: Android draws a child outside its parent only where the parent says so (P01 ticket 23).
  bar: { position: 'absolute', right: ANSWER_TOP.side, left: ANSWER_TOP.side, overflow: 'visible' },
  face: { paddingTop: space[3], paddingHorizontal: space[4], ...CARD_FACE },
  // The rows' room, which grows as the card is pulled open.
  grown: { overflow: 'hidden' },
  // At the right of the head row, its top at the row's top (the bar's padding), so that the two share their middle and
  // the track starts below both (P04 ticket 45).
  add: { position: 'absolute', top: space[3], right: space[3] },
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import type { Frame } from '@/features/assistant/answer-frame';
import { fromCardReplyOf } from '@/features/assistant/app-turn';
import { lookupTakesTheMap } from '@/features/assistant/step-choice';
import type { ShownBooking } from '@/features/assistant/booking-scene';
import type { ChatSheetControl } from '../chat-sheet';
import { bookingBarOf } from '../library/booking-kept';
import { barOf, onScreenOf } from './reply-words';
import { type CardPlace, StepsTop } from './steps-bar';
import { BookingBar } from './booking-bar';
import { LookupBar, PlanBar } from './time-bar';
import type { BandFocus } from './use-corrections';

// The time card at the top of the answer frame, by one rule for the answer to one request and for the step chosen
// among several (P03 ticket 23): a booking's card on the map first, else the Lookup's, else the Plan's on screen or
// the frame an answer with no Plan keeps (P01 ticket 31). Under the steps card it stands below that card and folds
// with it.
export type TopCard =
  | { kind: 'booking'; booking: ShownBooking }
  | { kind: 'lookup'; lookup: Lookup }
  | { kind: 'plan'; answer: AnswerReply; frame: Frame }
  | null;

export function topCardOf(control: ChatSheetControl, booking: ShownBooking | null): TopCard {
  if (booking !== null) {
    return { kind: 'booking', booking };
  }
  const bar = barOf(control.chat.bubbles, onScreenOf(control));
  if (bar === null) {
    return null;
  }
  if (bar.kind === 'lookup') {
    return { kind: 'lookup', lookup: bar.lookup };
  }
  const { answer: shown, invitation } = control;
  // None once 그대로 두기 left a Quest already set as it is, for the Plan is gone (P04 ticket 20).
  const leftAlone = invitation.left !== null && invitation.made === null && invitation.changed === null;
  return shown.answer === null || shown.frame === null || leftAlone
    ? null
    : { kind: 'plan', answer: shown.answer, frame: shown.frame };
}

// What the top card of the step chosen among several is drawn from: the one its own answer draws alone. A seat's step
// draws its card's booking while that card stands, and nothing else, the answer on screen being another step's; a
// room's has none on the map. An answer step draws its answer's, with the 관정관 a study answer opened (P10 ticket 27).
// Steps that do not name their answers (a main server before P05 ticket 74) all show the reply's one answer, so a step
// of them not done draws nothing.
export type StepCard<Booking> =
  { kind: 'booking'; booking: Booking } | { kind: 'answer'; opened: Booking | null } | null;

export function stepCardOf<Booking extends { card: { key: string }; inPlan?: true }>(
  step: ReplyStep | undefined,
  standing: Booking | null,
): StepCard<Booking> {
  if (step?.shows?.kind === 'card') {
    return standing !== null && standing.card.key === step.shows.key ? { kind: 'booking', booking: standing } : null;
  }
  if (step?.shows?.kind !== 'answer' || (step.shows.key === undefined && step.status !== 'shown')) {
    return null;
  }
  return { kind: 'answer', opened: standing?.inPlan === true ? standing : null };
}

function stepTopCardOf(control: ChatSheetControl, step: ReplyStep | undefined): TopCard {
  const { booking, chat } = control;
  const card = stepCardOf(step, booking === null || bookingBarOf(booking, chat) === null ? null : booking);
  if (card === null) {
    return null;
  }
  return card.kind === 'booking' ? card : topCardOf(control, card.opened);
}

interface TopBarProps {
  control: ChatSheetControl;
  focus: BandFocus;
  onClose: () => void;
  onHeight: (height: number) => void;
}

function TopCardView({
  card,
  control,
  focus,
  onClose,
  onHeight,
  offset,
  caret,
}: TopBarProps & { card: NonNullable<TopCard> } & Partial<Omit<CardPlace, 'onHeight'>>): ReactElement | null {
  const { answer: shown, invitation, chat } = control;
  if (card.kind === 'booking') {
    return <BookingBar booking={card.booking} caret={caret} chat={chat} offset={offset} onHeight={onHeight} />;
  }
  if (card.kind === 'lookup') {
    return <LookupBar lookup={card.lookup} offset={offset} onHeight={onHeight} />;
  }
  // An answer with no Plan keeps the time card it was asked in (P01 ticket 31).
  const fromCard = fromCardReplyOf(chat.bubbles, shown.source);
  return (
    <PlanBar
      answer={card.answer}
      caret={caret}
      focus={focus}
      invitation={invitation}
      offset={offset}
      onClose={onClose}
      onHeight={onHeight}
      plan={card.frame}
      shown={shown}
      toCard={
        fromCard === null
          ? null
          : () => {
              chat.takeBackTurn(fromCard);
            }
      }
    />
  );
}

// The time card of the turn on screen while it has a time, under the steps card for several requests.
export function TopBar(props: TopBarProps): ReactElement | null {
  const { control, onHeight } = props;
  const { steps, activeStep } = control;
  if (steps !== null) {
    // A Lookup the steps' reply gave stands in the chosen step's place, with no caret: it is no step (rule 7).
    const lookupTurn = lookupTakesTheMap(control.chat.bubbles.find(({ id }) => id === steps.bubbleId));
    const card = lookupTurn ? topCardOf(control, null) : stepTopCardOf(control, steps.steps[activeStep]);
    const drawCard =
      card === null
        ? null
        : (place: CardPlace): ReactElement | null => (
            <TopCardView {...props} {...place} caret={lookupTurn ? undefined : place.caret} card={card} />
          );
    return <StepsTop control={control} drawCard={drawCard} onHeight={onHeight} />;
  }
  const card = topCardOf(control, control.booking);
  return card === null ? null : <TopCardView {...props} card={card} />;
}

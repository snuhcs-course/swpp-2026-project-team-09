/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { stepShowsCard } from '@/features/assistant/step-choice';
import { useQuery } from '@tanstack/react-query';
import type { Plan } from '@/api/assistant-types';
import { questsQuery } from '@/api/queries';
import type { Quest } from '@/api/types';
import type { ShownBooking } from '@/features/assistant/booking-scene';
import { fixedOnDay } from '@/features/assistant/booking-day';
import { leftOutOf } from '@/features/assistant/left-out';
import type { Chat } from '@/features/assistant/use-chat';
import { spanOf } from '@/library/cards/slot-band';
import type { ChatSheetControl } from '../chat-sheet';
import { bookingBarOf } from '../library/booking-kept';
import { leftOutIdsOn, leftOutOfDay } from './booking-band';

// What stands on top of the answer: the Plan shown, the booking on the map, and whether several requests' bar holds the
// top in their place.
export interface OnTop {
  plan: Plan | null;
  booking: ShownBooking | null;
  steps: boolean;
}

type TopChat = Pick<Chat, 'bubbles' | 'rooms' | 'showRoom' | 'outcomes'>;

const NO_QUESTS: readonly Quest[] = [];

// Whether the folded time card on top draws the line of Classes left out (P01 ticket 40), so that the card makes room
// for it: the Plan's band draws one, or the booking's time card does, which stands unless another step's card is in its
// place (`steps`), and draws only the Classes of its day.
export function timeCardSkips({ plan, booking, steps }: OnTop, chat: TopChat, quests: readonly Quest[]): boolean {
  if ((plan?.band.skipped?.length ?? 0) > 0) {
    return true;
  }
  const bar = booking === null || steps ? null : bookingBarOf(booking, chat);
  if (bar === null) {
    return false;
  }
  const { live } = bar;
  const day = fixedOnDay(quests, live.date, spanOf(live));
  return leftOutOfDay(day, leftOutIdsOn(leftOutOf(chat.bubbles), live.date)).length > 0;
}

// Under the steps card the chosen step's card is on top: the seat's booking card for its step, else the Plan's
// (P03 ticket 23).
export function useTimeCardSkips(control: ChatSheetControl): boolean {
  const quests = useQuery(questsQuery).data ?? NO_QUESTS;
  const { steps, activeStep, booking, answer } = control;
  const bookingOnTop = booking !== null && stepShowsCard(steps, activeStep, booking.card.key);
  const onTop = { plan: steps !== null && bookingOnTop ? null : answer.plan, booking, steps: !bookingOnTop };
  return timeCardSkips(onTop, control.chat, quests);
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { Button } from '@/design-system';
import { meetInput } from '@/features/assistant/meet-input';
import type { Chat } from '@/features/assistant/use-chat';
import { friendIdOf } from '@/features/map/adapter';
import type { ChatSheetControl } from './chat-sheet';
import { type PlanAsk, usePlanAsk } from './use-plan-ask';

export const MEET = '만나고 싶다';

// "만나고 싶다" with a Friend asks the recalculation for a meet of the User and the Friend today, and its answer opens
// in the answer frame as a turn whose pill reads "{name} · 만나고 싶다". No model is asked.
export function useMeetAsk(
  addRecalculated: Chat['addRecalculated'],
  name: string,
): Pick<PlanAsk, 'asking'> & { ask: (userId: string) => void } {
  const plan = usePlanAsk(addRecalculated, name);
  return {
    asking: plan.asking,
    ask: (userId) => {
      plan.ask({ kind: 'plan', label: MEET, input: meetInput(myUserId(), userId, now()) });
    },
  };
}

function MeetButton({ chat, userId, name }: { chat: Chat; userId: string; name: string }): ReactElement {
  const meet = useMeetAsk(chat.addRecalculated, name);
  return (
    <Button
      busy={meet.asking}
      onPress={() => {
        meet.ask(userId);
      }}
    >
      {MEET}
    </Button>
  );
}

// A card of the everyday map with the button it draws first: "만나고 싶다" on a Friend's card, and none on any other
// card.
export function withMeet<Shown extends { id: string; title: string }>(
  card: Shown,
  chat: ChatSheetControl,
): { card: Shown; lead: ReactElement | undefined } {
  const userId = friendIdOf(card.id);
  const lead = userId === null ? undefined : <MeetButton chat={chat.chat} name={card.title} userId={userId} />;
  return { card, lead };
}

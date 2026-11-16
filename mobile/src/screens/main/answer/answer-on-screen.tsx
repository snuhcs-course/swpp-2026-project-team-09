/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { AnswerLine, AnswerReply } from '@/api/assistant-types';
import { now } from '@/clock';
import { isMealAlone, takenLines, walksThere } from '@/features/assistant/taken-lines';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { ShownLookup } from '@/features/assistant/use-shown-lookup';
import { InvitedCard } from './invited-card';
import { PlanCard } from './plan-card';
import { TakenCard } from './taken-card';

interface AnswerOnScreenProps {
  shown: ShownAnswer;
  answer: AnswerReply;
  lookup: ShownLookup;
  invitation: PlanInvitation;
  // How high the Plan's card may stand before the card scrolls, null until it is known.
  room: number | null;
  // A refusal's lines over the card.
  over: readonly AnswerLine[] | undefined;
  onClose: () => void;
}

// The card of the answer on screen: the Plan's, the invited Quest's once its Plan was made into one, or, for a meal's
// Plan taken alone with "여기로", where the User goes, whose "닫기" guides them to the Restaurant when they walk there.
export function AnswerOnScreen(props: AnswerOnScreenProps): ReactElement {
  const { shown, answer, lookup, invitation, room, over, onClose } = props;
  const { made, standings } = invitation;
  const { plan } = shown;
  if (made === null || plan === null) {
    return <PlanCard answer={answer} invitation={invitation} onClose={onClose} over={over} room={room} shown={shown} />;
  }
  if (isMealAlone(answer)) {
    const leave = walksThere(plan)
      ? (): void => {
          lookup.guide(plan.place);
        }
      : onClose;
    return <TakenCard lines={takenLines(answer, plan, now())} onAgain={invitation.again} onClose={leave} />;
  }
  return (
    <InvitedCard
      chips={answer.chips}
      onClose={onClose}
      over={over}
      standings={standings}
      startAt={plan.startAt}
      steps={made.quest.subQuests}
    />
  );
}

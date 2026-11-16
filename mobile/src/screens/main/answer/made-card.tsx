/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { AnswerLine, AnswerReply, Plan } from '@/api/assistant-types';
import type { PlanQuest } from '@/api/plan-quest-types';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import { InvitedCard } from './invited-card';
import { TakenCard } from './taken-card';

interface MadeCardProps {
  answer: AnswerReply;
  plan: Plan;
  made: PlanQuest;
  invitation: PlanInvitation;
  over: readonly AnswerLine[] | undefined;
  onClose: () => void;
}

// The card once the Plan on screen was made into a Quest: taken alone with "여기로", or invited with "이대로 초대".
export function MadeCard({ answer, plan, made, invitation, over, onClose }: MadeCardProps): ReactElement {
  if (made.alone !== undefined) {
    return (
      <TakenCard
        dropping={invitation.dropping}
        onAgain={invitation.again}
        onClose={onClose}
        over={over}
        plan={plan}
        taken={made.alone}
      />
    );
  }
  return (
    <InvitedCard
      chips={answer.chips}
      onClose={onClose}
      over={over}
      standings={invitation.standings}
      startAt={plan.startAt}
      steps={made.quest.subQuests}
    />
  );
}

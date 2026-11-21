/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useRef, useState } from 'react';
import type { AnswerReply } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { changedLineOf, setQuestOf } from './set-quest';
import type { Inviting } from './use-plan-invitation';
import { makingOf } from './use-plan-invitation';
import type { ShownAnswer } from './use-shown-answer';

const NOT_CHANGED = '바꾸지 못했어요. 잠시 후 다시 시도해 주세요';

// 바꾸기 of a meeting the User already holds (P04 ticket 17, P05 ticket 17): the Plan on screen replaces that Quest's in
// place (`PUT /plans/{questId}`), and the main server tells its Holders. The answer then stays and says so (`changed`,
// its line, while that answer is on screen), as it stays after 만들고 초대 보내기; a failure is told, and 바꾸기 can be
// pressed again. A second press while one is on its way does nothing.
export function usePlanChange(
  shown: Pick<ShownAnswer, 'answer' | 'plan'>,
  inviting: Inviting,
): { change: (questId: string) => void; changing: boolean; changed: string | null } {
  const [changing, setChanging] = useState(false);
  const [changed, setChanged] = useState<{ answer: AnswerReply; line: string } | null>(null);
  const flight = useRef(false);
  const change = (questId: string): void => {
    const { answer, plan } = shown;
    if (answer === null || plan === null || flight.current) {
      return;
    }
    flight.current = true;
    setChanging(true);
    apiClient.changePlanQuest(questId, makingOf(answer, plan, inviting)).then(
      () => {
        flight.current = false;
        setChanging(false);
        setChanged({ answer, line: changedLineOf(plan.startAt, setQuestOf(answer)?.people ?? []) });
      },
      () => {
        flight.current = false;
        setChanging(false);
        inviting.say(NOT_CHANGED);
      },
    );
  };
  return { change, changing, changed: changed?.answer === shown.answer ? changed.line : null };
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useRef, useState } from 'react';
import type { AnswerReply } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import { changedLineOf, leftLineOf, setQuestOf } from './set-quest';
import { NOT_HERE, refusedHere } from './set-refusals';
import type { Inviting } from './use-plan-invitation';
import { CHANGED, makingOf } from './use-plan-invitation';
import type { ShownAnswer } from './use-shown-answer';

const NOT_CHANGED = '바꾸지 못했어요. 잠시 후 다시 시도해 주세요';

// What the User chose beside a Quest already set, for the answer and the Plan it was chosen on: the line, and whether
// 바꾸기 changed the meeting or was refused for good, or 그대로 두기 left the Quest as it is (ticket 20).
interface Chosen {
  answer: AnswerReply;
  planId: string;
  line: string;
  how: 'changed' | 'refused' | 'left';
}

// A failure 바꾸기 may be pressed again after: a Plan that changed since the answer came is recalculated first.
function tellFailure(error: unknown, say: Inviting['say'], change: ShownAnswer['change']): void {
  if (isRefusal(error, 409, 'PLAN_CHANGED')) {
    say(CHANGED);
    change((input) => ({ ...input }));
  } else {
    say(NOT_CHANGED);
  }
}

// 바꾸기 and 그대로 두기 beside a Quest already set, and the line each leaves (`PlanInvitation` says what each is).
interface PlanChange {
  change: (questId: string) => void;
  changing: boolean;
  changed: string | null;
  refused: string | null;
  leave: () => void;
  left: string | null;
}

// 바꾸기 of a meeting the User already holds (P04 ticket 17, P05 ticket 17): the Plan on screen replaces that Quest's in
// place (`PUT /plans/{questId}`), and the main server tells its Holders. The answer then stays and says so (`changed`,
// its line, while that answer and Plan are on screen), as it stays after 만들고 초대 보내기. A Plan that changed since
// the answer came (409 PLAN_CHANGED) is recalculated, as a made Plan's is; a refusal that would repeat on every press
// (the meeting's people changed, or the User no longer leads it) is the answer's line (`refused`), which sends the User
// to its 파티; any other failure is told, and 바꾸기 can be pressed again. A second press while one is on its way does
// nothing, and `changing` holds the answer still until it returns. 그대로 두기 (`leave`, ticket 20) leaves the Quest as
// it is and sends nothing; the answer stays too, and `left` is its line.
export function usePlanChange(shown: Pick<ShownAnswer, 'answer' | 'plan' | 'change'>, inviting: Inviting): PlanChange {
  const [changing, setChanging] = useState(false);
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const flight = useRef(false);
  const change = (questId: string): void => {
    const { answer, plan } = shown;
    if (answer === null || plan === null || flight.current) {
      return;
    }
    flight.current = true;
    setChanging(true);
    const settle = (): void => {
      flight.current = false;
      setChanging(false);
    };
    apiClient.changePlanQuest(questId, makingOf(answer, plan, inviting)).then(
      () => {
        settle();
        const line = changedLineOf(plan.startAt, setQuestOf(answer)?.people ?? []);
        setChosen({ answer, planId: plan.id, line, how: 'changed' });
      },
      (error: unknown) => {
        settle();
        if (refusedHere(error)) {
          setChosen({ answer, planId: plan.id, line: NOT_HERE, how: 'refused' });
        } else {
          tellFailure(error, inviting.say, shown.change);
        }
      },
    );
  };
  const leave = (): void => {
    const { answer, plan } = shown;
    const set = setQuestOf(answer);
    if (answer !== null && plan !== null && set !== null && !flight.current) {
      setChosen({ answer, planId: plan.id, line: leftLineOf(set), how: 'left' });
    }
  };
  const current = chosen?.answer === shown.answer && chosen.planId === shown.plan?.id ? chosen : null;
  return {
    change,
    changing,
    changed: current?.how === 'changed' ? current.line : null,
    refused: current?.how === 'refused' ? current.line : null,
    leave,
    left: current?.how === 'left' ? current.line : null,
  };
}

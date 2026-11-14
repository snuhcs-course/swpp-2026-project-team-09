/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerReply } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import { newIdempotencyKey } from '@/api/idempotency-key';
import type { PlanQuest } from '@/api/plan-quest-types';
import { questsQuery } from '@/api/queries';
import type { LatLng, Quest } from '@/api/types';
import { type InvitationAnswer, onInvitationAnswer } from '@/live/invitation-answers';
import { friendStandings, type Standing } from './invited-friends';
import type { ShownAnswer } from './use-shown-answer';

export interface PlanInvitation {
  // The request is on its way.
  sending: boolean;
  // The Quest made from the Plan on screen, until the answer on screen changes.
  made: PlanQuest | null;
  // How each invited Friend stands, by user id: none until the Quest is made.
  standings: ReadonlyMap<string, Standing>;
  invite: () => void;
}

// Where the User is, which the request sends, and how a refusal is told.
export interface Inviting {
  location: LatLng | null;
  say: (message: string) => void;
}

const CHANGED = '계획이 바뀌었어요. 다시 확인해 주세요';
const FAILED = '초대하지 못했어요. 잠시 후 다시 시도해 주세요';

interface InvitationState {
  answer: AnswerReply | null;
  planId: string | null;
  // Made at the first press for this answer and Plan, and kept, so that a press again repeats the request.
  key: string | null;
  sending: boolean;
  made: PlanQuest | null;
  heard: InvitationAnswer[];
}

type OnScreen = Pick<ShownAnswer, 'answer' | 'plan' | 'change'>;
type SetStored = (update: (last: InvitationState) => InvitationState) => void;

const NO_STANDINGS: ReadonlyMap<string, Standing> = new Map();

function fresh(answer: AnswerReply | null, planId: string | null): InvitationState {
  return { answer, planId, key: null, sending: false, made: null, heard: [] };
}

function useMembers(made: PlanQuest | null): Quest['members'] {
  const questId = made?.quest.id;
  return useQuery({
    ...questsQuery,
    enabled: questId !== undefined,
    select: (quests: Quest[]) => quests.find(({ id }) => id === questId)?.members,
  }).data;
}

function useHeard(made: PlanQuest | null, setStored: SetStored): void {
  const questId = made?.quest.id;
  useEffect(
    () =>
      questId === undefined
        ? undefined
        : onInvitationAnswer((answer) => {
            if (answer.questId === questId) {
              setStored((last) =>
                last.made?.quest.id === questId ? { ...last, heard: [...last.heard, answer] } : last,
              );
            }
          }),
    [questId, setStored],
  );
}

// Sends the Plan on screen to be made into a Quest, unless a request is on its way or the Quest is made. A reply, or
// a refusal, counts only while the request's key is still the one held: another answer or Plan on screen drops it.
function useInvite(current: InvitationState, shown: OnScreen, setStored: SetStored, inviting: Inviting): () => void {
  const live = useRef({ current, shown, inviting });
  const flight = useRef<string | null>(null);
  useEffect(() => {
    live.current = { current, shown, inviting };
  });
  return () => {
    const { current: state, shown: now, inviting: how } = live.current;
    const { answer, plan } = now;
    if (answer === null || plan === null || state.made !== null || flight.current !== null) {
      return;
    }
    const key = state.key ?? newIdempotencyKey();
    flight.current = key;
    setStored((last) => (last.answer === answer && last.planId === plan.id ? { ...last, key, sending: true } : last));
    const settle = (made: PlanQuest | null): boolean => {
      flight.current = null;
      setStored((last) => (last.key === key ? { ...last, sending: false, made } : last));
      const { shown: after } = live.current;
      return after.answer === answer && after.plan?.id === plan.id;
    };
    const making = { input: answer.input, planId: plan.id, startAt: plan.startAt, location: how.location };
    apiClient.makePlanQuest(making, key).then(
      (made) => {
        settle(made);
      },
      (error: unknown) => {
        if (!settle(null)) {
          return;
        }
        if (isRefusal(error, 409, 'PLAN_CHANGED')) {
          how.say(CHANGED);
          live.current.shown.change((input) => ({ ...input }));
        } else {
          how.say(FAILED);
        }
      },
    );
  };
}

// The Quest made from the Plan on screen by "이대로 초대", and how each invited Friend stands: by the signals heard for
// the Quest since, by its members once the User's Quests hold it, and otherwise invited. A new answer or another Plan
// on screen drops it, and the Quest stays among the User's Quests.
export function usePlanInvitation(shown: OnScreen, inviting: Inviting): PlanInvitation {
  const planId = shown.plan?.id ?? null;
  const [stored, setStored] = useState<InvitationState>(() => fresh(shown.answer, planId));
  const current = stored.answer === shown.answer && stored.planId === planId ? stored : fresh(shown.answer, planId);
  if (current !== stored) {
    setStored(current);
  }
  const invite = useInvite(current, shown, setStored, inviting);
  const { made, heard } = current;
  const members = useMembers(made);
  useHeard(made, setStored);
  const standings = useMemo(
    () => (made === null ? NO_STANDINGS : friendStandings(made, members, heard)),
    [made, members, heard],
  );
  return { sending: current.sending, made, standings, invite };
}

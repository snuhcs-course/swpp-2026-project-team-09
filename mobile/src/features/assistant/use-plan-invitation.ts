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
import { onInvitationAnswer } from '@/live/invitation-answers';
import { friendStandings, type HeardAnswer, NO_STANDINGS, type ReadMembers, type Standing } from './invited-friends';
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

// Where the User is, which the request sends, and how a refusal or a Quest made out of sight is told.
export interface Inviting {
  location: LatLng | null;
  say: (message: string) => void;
}

const CHANGED = '계획이 바뀌었어요. 다시 확인해 주세요';
const FAILED = '초대하지 못했어요. 잠시 후 다시 시도해 주세요';
const SENT = '파티를 만들고 초대를 보냈어요';

interface InvitationState {
  answer: AnswerReply | null;
  // By Plan id: made at the first press for a Plan of this answer, and kept while the answer is on screen, so that a
  // press again, also after another Plan was shown, repeats the request.
  keys: ReadonlyMap<string, string>;
  planId: string | null;
  made: PlanQuest | null;
  heard: HeardAnswer[];
}

type OnScreen = Pick<ShownAnswer, 'answer' | 'plan' | 'change'>;
type SetStored = (update: (last: InvitationState) => InvitationState) => void;

function fresh(answer: AnswerReply | null, planId: string | null): InvitationState {
  return { answer, keys: new Map(), planId, made: null, heard: [] };
}

// What is held for the answer and the Plan on screen: another answer drops everything, another Plan what was made.
function heldFor(stored: InvitationState, answer: AnswerReply | null, planId: string | null): InvitationState {
  if (stored.answer !== answer) {
    return fresh(answer, planId);
  }
  return stored.planId === planId ? stored : { ...stored, planId, made: null, heard: [] };
}

function useMembers(made: PlanQuest | null): ReadMembers | null {
  const questId = made?.quest.id;
  const { data: members, dataUpdatedAt } = useQuery({
    ...questsQuery,
    enabled: questId !== undefined,
    select: (quests: Quest[]) => quests.find(({ id }) => id === questId)?.members,
  });
  return useMemo(() => (members === undefined ? null : { members, readAt: dataUpdatedAt }), [members, dataUpdatedAt]);
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
                last.made?.quest.id === questId
                  ? { ...last, heard: [...last.heard, { ...answer, heardAt: Date.now() }] }
                  : last,
              );
            }
          }),
    [questId, setStored],
  );
}

// A Plan that changed is recalculated from conditions equal to the same, as a new object, for a change must differ.
function tellRefusal(error: unknown, say: Inviting['say'], change: ShownAnswer['change']): void {
  if (isRefusal(error, 409, 'PLAN_CHANGED')) {
    say(CHANGED);
    change((input) => ({ ...input }));
  } else {
    say(FAILED);
  }
}

// Sends the Plan on screen to be made into a Quest, unless a request of this hook is on its way or the Quest is made.
// A Quest that comes while its answer and Plan are still on screen is held; otherwise it is only told, for it is among
// the User's Quests. A refusal counts only while its answer and Plan are on screen.
function useInvite(
  current: InvitationState,
  shown: OnScreen,
  setStored: SetStored,
  inviting: Inviting,
): { sending: boolean; invite: () => void } {
  const live = useRef({ current, shown, inviting });
  const flight = useRef(false);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    live.current = { current, shown, inviting };
  });
  const invite = (): void => {
    const { current: state, shown: now, inviting: how } = live.current;
    const { answer, plan } = now;
    if (answer === null || plan === null || state.made !== null || flight.current) {
      return;
    }
    const key = state.keys.get(plan.id) ?? newIdempotencyKey();
    flight.current = true;
    setSending(true);
    setStored((last) => (last.answer === answer ? { ...last, keys: new Map(last.keys).set(plan.id, key) } : last));
    const settle = (): boolean => {
      flight.current = false;
      setSending(false);
      const { shown: after } = live.current;
      return after.answer === answer && after.plan?.id === plan.id;
    };
    const making = { input: answer.input, planId: plan.id, startAt: plan.startAt, location: how.location };
    apiClient.makePlanQuest(making, key).then(
      (made) => {
        if (settle()) {
          setStored((last) => (last.answer === answer && last.planId === plan.id ? { ...last, made } : last));
        } else {
          live.current.inviting.say(SENT);
        }
      },
      (error: unknown) => {
        if (settle()) {
          tellRefusal(error, how.say, live.current.shown.change);
        }
      },
    );
  };
  return { sending, invite };
}

// The Quest made from the Plan on screen by "이대로 초대", and how each invited Friend stands: by the latest of the
// signals heard for the Quest since and its members as the User's Quests hold them, and otherwise invited. A new answer
// or another Plan on screen drops it, and the Quest stays among the User's Quests.
export function usePlanInvitation(shown: OnScreen, inviting: Inviting): PlanInvitation {
  const planId = shown.plan?.id ?? null;
  const [stored, setStored] = useState<InvitationState>(() => fresh(shown.answer, planId));
  const current = heldFor(stored, shown.answer, planId);
  if (current !== stored) {
    setStored(current);
  }
  const { sending, invite } = useInvite(current, shown, setStored, inviting);
  const { made, heard } = current;
  const members = useMembers(made);
  useHeard(made, setStored);
  const standings = useMemo(
    () => (made === null ? NO_STANDINGS : friendStandings(made, members, heard)),
    [made, members, heard],
  );
  return { sending, made, standings, invite };
}

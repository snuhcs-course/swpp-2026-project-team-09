/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { ApiError, isRefusal } from '@/api/errors';
import { refusalWords } from '@/features/quests/refusals';
import { newIdempotencyKey } from '@/api/idempotency-key';
import type { MakePlanQuest, PlanQuest } from '@/api/plan-quest-types';
import type { LocationMissing } from '@/api/refusal-types';
import { questsQuery } from '@/api/queries';
import type { LatLng, Quest } from '@/api/types';
import { onInvitationAnswer } from '@/live/invitation-answers';
import { useAskForPush } from '@/push/push-ask-host';
import { friendStandings, type HeardAnswer, NO_STANDINGS, type ReadMembers, type Standing } from './invited-friends';
import { sentToastOf } from './invited-words';
import { useKeepMadeQuest } from './made-quest-ids';
import { samePlanConditions } from './plan-conditions';
import { setRefusalWords } from './set-refusals';
import { usePlanChange } from './use-plan-change';
import type { ShownAnswer } from './use-shown-answer';

export interface PlanInvitation {
  // The request is on its way.
  sending: boolean;
  // The Quest made from the Plan on screen, until the answer on screen changes.
  made: PlanQuest | null;
  // How each invited Friend stands, by user id: none until the Quest is made.
  standings: ReadonlyMap<string, Standing>;
  // "이대로 초대", and "여기로" for a Plan taken alone.
  invite: () => void;
  // "다시 고르기" after "여기로": the Quest held alone ends with its leave-by, and the Plan shows again.
  again: () => void;
  // "다시 고르기" is on its way.
  dropping: boolean;
  // 바꾸기 of a meeting already set (P04 ticket 17): the Plan on screen becomes that Quest's; then `changed` is the
  // answer's line, which says so.
  change: (questId: string) => void;
  changing: boolean;
  changed: string | null;
  // 바꾸기 refused for good (PR 442's review): the answer's line, which sends the User to the 파티.
  refused: string | null;
  // 그대로 두기 (ticket 20): the Quest stays as it is, and `left` is the answer's line, which says so.
  leave: () => void;
  left: string | null;
}

// Where the User is or why that is not known, which the request sends, and how a refusal or a Quest made out of sight
// is told.
export interface Inviting {
  location: LatLng | null;
  locationMissing?: LocationMissing;
  say: (message: string) => void;
}

// The answer's conditions, the Plan on screen, and where the User is or why that is not known, the reason left out
// when it is, since a main server before P02-13 refuses the key.
export function makingOf(
  answer: AnswerReply,
  plan: Plan,
  { location, locationMissing = null }: Inviting,
): MakePlanQuest {
  const why = locationMissing === null ? {} : { locationMissing };
  return { input: answer.input, planId: plan.id, startAt: plan.startAt, location, ...why };
}

export const CHANGED = '계획이 바뀌었어요. 다시 확인해 주세요';
const FAILED = '초대하지 못했어요. 잠시 후 다시 시도해 주세요';
const TAKEN = '여기로 정했어요';
const NOT_DROPPED = '다시 고르지 못했어요. 잠시 후 다시 시도해 주세요';
// "여기로" invites nobody.
const NOT_TAKEN = '답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요';

// A Plan "여기로" takes alone: an events Plan, or a meal's or a meet's for the asker only.
function takenAlone(input: AnswerReply['input']): boolean {
  return input.kind === 'events' || ((input.kind === 'meal' || input.kind === 'meet') && input.people.length < 2);
}

// The first request for a Plan and its idempotency key. A press again sends the same request: the main server tells a
// retry by the key and the whole body, which carries where the User was.
interface Sent {
  key: string;
  making: MakePlanQuest;
}

interface InvitationState {
  answer: AnswerReply | null;
  // By Plan id: made at the first press for a Plan of this answer, and kept while the answer is on screen, so that a
  // press again, also after another Plan was shown, repeats the request.
  sent: ReadonlyMap<string, Sent>;
  planId: string | null;
  made: PlanQuest | null;
  heard: HeardAnswer[];
}

type OnScreen = Pick<ShownAnswer, 'answer' | 'plan' | 'change'>;
type SetStored = (update: (last: InvitationState) => InvitationState) => void;

function fresh(answer: AnswerReply | null, planId: string | null): InvitationState {
  return { answer, sent: new Map(), planId, made: null, heard: [] };
}

// What is held for the answer and the Plan on screen. Another answer keeps, while nothing was made, the request of each
// Plan that stands the same in it (its id, day, start, place, and people), as after a kind chip pressed after a
// failure, so that its retry keeps its key; every other Plan starts fresh. Another Plan drops what was made.
function heldFor(stored: InvitationState, answer: AnswerReply | null, planId: string | null): InvitationState {
  if (stored.answer !== answer) {
    const kept = [...stored.sent].filter(([id]) => samePlanConditions(stored.answer, answer, id));
    const next = fresh(answer, planId);
    return stored.made === null && kept.length > 0 ? { ...next, sent: new Map(kept) } : next;
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
function tellRefusal(error: unknown, say: Inviting['say'], change: ShownAnswer['change'], alone: boolean): void {
  if (isRefusal(error, 409, 'PLAN_CHANGED')) {
    say(CHANGED);
    change((input) => ({ ...input }));
  } else if (setRefusalWords(error) !== null) {
    say(setRefusalWords(error) ?? FAILED);
  } else if (alone) {
    // A 파티 of the User's own for the event refuses "여기로" with SHARED_QUEST_HELD, worded as 파티 says it.
    say(isRefusal(error, 409, 'SHARED_QUEST_HELD') ? refusalWords(error) : NOT_TAKEN);
  } else {
    say(FAILED);
  }
}

// A refusal (4xx) made nothing, so the Plan's request goes and a press again asks anew. No answer, a 5xx, or the first
// request still on its way (IDEMPOTENCY_KEY_IN_USE) keeps it, as the Quest may have been made.
function forgetIfRefused(error: unknown, setStored: SetStored, answer: AnswerReply, planId: string): void {
  if (
    !(error instanceof ApiError) ||
    error.status === 0 ||
    error.status >= 500 ||
    isRefusal(error, 409, 'IDEMPOTENCY_KEY_IN_USE')
  ) {
    return;
  }
  setStored((last) => {
    if (last.answer !== answer) {
      return last;
    }
    const sent = new Map(last.sent);
    sent.delete(planId);
    return { ...last, sent };
  });
}

// The phone keeps the id of a Quest made with Friends, whose flag the map draws; a Quest taken alone has none.
function useKeepParty(): (made: PlanQuest) => void {
  const keepMade = useKeepMadeQuest();
  return (made) => {
    if (made.alone === undefined) {
      keepMade(made.quest.id);
    }
  };
}

// Sends the Plan on screen to be made into a Quest, unless a request of this hook is on its way or the Quest is made.
// A Quest that comes while its answer and Plan are still on screen is held; otherwise it is only told, for it is among
// the User's Quests. Either way the phone keeps a party's id and asks about push (board t17). A refusal counts only while its
// answer and Plan are on screen.
function useInvite(
  current: InvitationState,
  shown: OnScreen,
  setStored: SetStored,
  inviting: Inviting,
): { sending: boolean; invite: () => void } {
  const live = useRef({ current, shown, inviting });
  const flight = useRef(false);
  const [sending, setSending] = useState(false);
  const keepMade = useKeepParty();
  const askForPush = useAskForPush();
  useEffect(() => {
    live.current = { current, shown, inviting };
  });
  const invite = (): void => {
    const { current: state, shown: now, inviting: how } = live.current;
    const { answer, plan } = now;
    if (answer === null || plan === null || state.made !== null || flight.current) {
      return;
    }
    const first = state.sent.get(plan.id) ?? { key: newIdempotencyKey(), making: makingOf(answer, plan, how) };
    flight.current = true;
    setSending(true);
    setStored((last) => (last.answer === answer ? { ...last, sent: new Map(last.sent).set(plan.id, first) } : last));
    const settle = (): boolean => {
      flight.current = false;
      setSending(false);
      const { shown: after } = live.current;
      return after.answer === answer && after.plan?.id === plan.id;
    };
    apiClient.makePlanQuest(first.making, first.key).then(
      (made) => {
        keepMade(made);
        askForPush();
        if (settle()) {
          setStored((last) => (last.answer === answer && last.planId === plan.id ? { ...last, made } : last));
        } else {
          live.current.inviting.say(made.alone === undefined ? sentToastOf(answer.chips, made.quest.title) : TAKEN);
        }
      },
      (error: unknown) => {
        forgetIfRefused(error, setStored, answer, plan.id);
        if (settle()) {
          tellRefusal(error, how.say, live.current.shown.change, takenAlone(answer.input));
        }
      },
    );
  };
  return { sending, invite };
}

// Whether the User's Quests show the Quest without the mark of one taken alone: the party form made it a 파티 for its
// event.
function gathers(quests: Quest[], questId: string): boolean {
  return quests.find(({ id }) => id === questId)?.takenAlone === false;
}

// The taken card of the Quest goes, and the Plan's request with it, so that "여기로" asks anew.
function withoutCard(last: InvitationState, questId: string): InvitationState {
  if (last.made?.quest.id !== questId || last.planId === null) {
    return last;
  }
  const sent = new Map(last.sent);
  sent.delete(last.planId);
  return { ...last, sent, made: null };
}

// A taken card whose Quest now gathers others goes, once the User's Quests show it so: they are read again on
// `quests-changed`.
function useGathered(made: PlanQuest | null, setStored: SetStored): void {
  const questId = made?.alone === undefined ? undefined : made.quest.id;
  const { data: gathering } = useQuery({
    ...questsQuery,
    enabled: questId !== undefined,
    select: (quests: Quest[]) => questId !== undefined && gathers(quests, questId),
  });
  useEffect(() => {
    if (gathering === true && questId !== undefined) {
      setStored((last) => withoutCard(last, questId));
    }
  }, [gathering, questId, setStored]);
}

// "다시 고르기": drops the Quest taken alone, and once it is gone shows the Plan again with a new key for it, so that
// "여기로" makes another. A Quest already gone, ended by its time, dropped elsewhere, or replaced by a 파티, counts as
// given up. One that now gathers others is never dropped from here: the User's Quests are read first, and the card
// only goes. When they cannot be read, nothing is dropped.
function useAgain(
  made: PlanQuest | null,
  setStored: SetStored,
  say: Inviting['say'],
): Pick<PlanInvitation, 'again' | 'dropping'> {
  const [dropping, setDropping] = useState(false);
  const questId = made?.alone === undefined ? null : made.quest.id;
  const again = useCallback((): void => {
    if (questId === null || dropping) {
      return;
    }
    const gone = (): void => {
      setDropping(false);
      setStored((last) => withoutCard(last, questId));
    };
    const failed = (): void => {
      setDropping(false);
      say(NOT_DROPPED);
    };
    const drop = (): void => {
      apiClient.dropQuest(questId).then(gone, (error: unknown) => {
        if (isRefusal(error, 404, 'QUEST_NOT_FOUND')) {
          gone();
        } else {
          failed();
        }
      });
    };
    setDropping(true);
    apiClient.listQuests().then((quests) => {
      if (gathers(quests, questId)) {
        gone();
      } else {
        drop();
      }
    }, failed);
  }, [questId, dropping, setStored, say]);
  return { again, dropping };
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
  const { again, dropping } = useAgain(made, setStored, inviting.say);
  const { change, changing, changed, refused, leave, left } = usePlanChange(shown, inviting);
  useGathered(made, setStored);
  const standings = useMemo(
    () => (made === null ? NO_STANDINGS : friendStandings(made, members, heard)),
    [made, members, heard],
  );
  return { sending, made, standings, invite, again, dropping, change, changing, changed, refused, leave, left };
}

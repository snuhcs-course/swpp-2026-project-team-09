/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import { newIdempotencyKey } from '@/api/idempotency-key';
import { QUESTS_KEY, RECRUITING_KEY, SENT_INVITATIONS_KEY } from '@/api/queries';
import type { ShownQuest } from '@/api/quest-parts-types';
import type { Quest } from '@/api/types';
import { type IconName, useToast } from '@/design-system';
import {
  attendingTitleOf,
  changeOf,
  makingOf,
  meetingOf,
  type PartyForm,
  type PlanChange,
  recruitingOf,
  staysAlone,
} from '@/features/party/making';
import { heldAlone } from '@/features/quests/adapter';
import { refusalWords } from '@/features/quests/refusals';
import { useAskForPush } from '@/push/push-ask-host';
import { trackAction } from '@/telemetry';

const NOT_SAVED = '저장하지 못했어요. 다시 시도해 주세요';
// Inviting into a 파티 its Holders fill at that moment; one with places left invites any number.
const FULL_TO_INVITE = '자리가 다 차서 초대할 수 없어요';

// The Friends the main server refused to invite, and whether any was refused because the 파티 was full at that moment,
// which the toast says in place of the count: the Friends refused otherwise are the same 파티's.
interface InviteRefusals {
  count: number;
  full: boolean;
}

// Invites each Friend.
async function invite(questId: string, friends: readonly string[]): Promise<InviteRefusals> {
  const answers = await Promise.allSettled(friends.map((userId) => apiClient.inviteToQuest(questId, userId)));
  const refused = answers.flatMap((answer) => (answer.status === 'rejected' ? [answer.reason as unknown] : []));
  return { count: refused.length, full: refused.some((error) => isRefusal(error, 409, 'QUEST_FULL')) };
}

// What was done: a Quest taken alone, a 비공개 파티 or a posted one, made or changed.
function doneOf(form: PartyForm, editing: boolean, alone: boolean): string {
  if (alone) {
    return editing ? '퀘스트를 수정했어요' : '퀘스트를 만들었어요';
  }
  if (editing) {
    return '모집글을 수정했어요';
  }
  return form.visibility === 'private' ? '비공개 파티를 만들었어요' : '파티를 올렸어요';
}

// "파티를 올렸어요 · 2명에게 초대 요청", and the Friends the main server refused after it.
function toastOf(done: string, editing: boolean, invited: number, refused: InviteRefusals): string {
  const main = editing || invited === 0 ? done : `${done} · ${String(invited)}명에게 초대 요청`;
  if (refused.count === 0) {
    return main;
  }
  return `${main} · ${refused.full ? FULL_TO_INVITE : `${String(refused.count)}명은 초대하지 못했어요`}`;
}

// An edit: the Quest's fields, then the time and place of its plan.
async function change(quest: ShownQuest, form: PartyForm, plan: PlanChange | null, alone: boolean): Promise<void> {
  const fields = changeOf(quest, form, alone);
  if (Object.keys(fields).length > 0) {
    await apiClient.changeQuest(quest.id, fields);
  }
  if (plan === null) {
    return;
  }
  await (plan.subQuestId === null
    ? apiClient.addSubQuest(quest.id, plan.content, newIdempotencyKey())
    : apiClient.editSubQuest(quest.id, plan.subQuestId, plan.content));
}

// With an event, the Quest is the one attending it gives, which the form then changes: the recruiting, and `모이기`
// when the User meets before the event.
async function recruitFor(attended: Quest, form: PartyForm, elsewhere: boolean): Promise<void> {
  await apiClient.changeQuest(attended.id, recruitingOf(attended, form));
  const meeting = meetingOf(form, elsewhere);
  if (meeting !== null) {
    await apiClient.addSubQuest(attended.id, meeting, newIdempotencyKey());
  }
}

// A 파티 made, for the usage data: by attending a Global Event too, whether or not it made a new Quest.
function making<Answer>(form: PartyForm, request: () => Promise<Answer>): Promise<Answer> {
  return trackAction({ action: 'party_creation', visibility: form.visibility }, request);
}

// What sending did: `taken`, `refused` with the form kept, or `room` when a step after attending the event failed and
// the Quest stays, which its room finishes.
export type Sent = 'taken' | 'refused' | 'room';

// What sending did, with the Quest it made or changed and the words of its toast. Whoever sends shows the toast and
// moves on: the form, or the chat's Proposal card. `invitesRefused`: a Friend was not invited, which the toast says
// with the alert icon although the Quest was made or changed.
export type Sending =
  | { sent: 'refused'; toast: string }
  | { sent: 'taken' | 'room'; questId: string; toast: string; invitesRefused?: boolean; alone?: boolean };

// The icon of a sending's toast, for every one who shows it: ✓ only for a Quest made or changed with every Friend
// invited; a refusal, a step left to the room and a Friend left uninvited are failures, with the alert icon.
export function sendingIcon(sending: Sending): IconName {
  return sending.sent === 'taken' && sending.invitesRefused !== true ? 'check' : 'alert';
}

// Sends the form: makes the Quest, for an event by attending it, or changes it, then invites the chosen Friends. It
// shows nothing and goes nowhere.
export function useSendParty(
  quest: ShownQuest | null,
): (form: PartyForm, friends: readonly string[], plan: PlanChange | null, elsewhere?: boolean) => Promise<Sending> {
  const queryClient = useQueryClient();
  const askForPush = useAskForPush();
  const refetch = (): void => {
    for (const queryKey of [QUESTS_KEY, RECRUITING_KEY, SENT_INVITATIONS_KEY]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
  return async (form, friends, plan, elsewhere = false) => {
    const alone = staysAlone(form, friends.length, quest === null || heldAlone(quest));
    let questId: string;
    let attended: Quest | null = null;
    try {
      if (quest !== null) {
        await change(quest, form, plan, alone);
        questId = quest.id;
      } else if (form.event === null) {
        questId = (await making(form, () => apiClient.makeQuest(makingOf(form, alone), newIdempotencyKey()))).id;
      } else {
        const eventId = form.event.id;
        attended = await making(form, () => apiClient.attendGlobalEvent(eventId, attendingTitleOf(form)));
        questId = attended.id;
      }
    } catch (error) {
      return { sent: 'refused', toast: refusalWords(error, {}, NOT_SAVED) };
    }
    if (attended !== null) {
      try {
        await recruitFor(attended, form, elsewhere);
      } catch (error) {
        refetch();
        return { sent: 'room', questId, toast: refusalWords(error, {}, NOT_SAVED) };
      }
    }
    const refused = await invite(questId, friends);
    const invited = friends.length - refused.count;
    refetch();
    if (invited > 0) {
      askForPush();
    }
    const toast = toastOf(doneOf(form, quest !== null, alone), quest !== null, invited, refused);
    return { sent: 'taken', questId, toast, invitesRefused: refused.count > 0, alone };
  };
}

// The form's sending: its toast, and the room when the Quest stays after a failed step.
export function useSend(
  quest: ShownQuest | null,
): (form: PartyForm, friends: string[], plan: PlanChange | null, elsewhere: boolean) => Promise<Sending> {
  const sendParty = useSendParty(quest);
  const showToast = useToast();
  return async (form, friends, plan, elsewhere) => {
    const sending = await sendParty(form, friends, plan, elsewhere);
    showToast(sending.toast, undefined, sendingIcon(sending));
    if (sending.sent === 'room') {
      router.replace(`/room/${sending.questId}`);
    }
    return sending;
  };
}

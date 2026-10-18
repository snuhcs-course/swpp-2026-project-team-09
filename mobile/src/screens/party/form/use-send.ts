/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { newIdempotencyKey } from '@/api/idempotency-key';
import { QUESTS_KEY, RECRUITING_KEY, SENT_INVITATIONS_KEY } from '@/api/queries';
import type { ShownQuest } from '@/api/quest-parts-types';
import type { Quest } from '@/api/types';
import { useToast } from '@/design-system';
import {
  attendingTitleOf,
  changeOf,
  entriesChangeOf,
  makingOf,
  meetingOf,
  type PartyForm,
  type PlanChange,
  recruitingOf,
} from '@/features/party/making';
import { refusalWords } from '@/features/quests/refusals';

const NOT_SAVED = '저장하지 못했어요. 다시 시도해 주세요';

// Invites each Friend and counts those the main server refused.
async function invite(questId: string, friends: readonly string[]): Promise<number> {
  const answers = await Promise.allSettled(friends.map((userId) => apiClient.inviteToQuest(questId, userId)));
  return answers.filter(({ status }) => status === 'rejected').length;
}

// "파티를 올렸어요 · 2명에게 초대 요청", and the Friends the main server refused after it.
function toastOf(form: PartyForm, editing: boolean, invited: number, missed: number): string {
  const done = editing
    ? '모집글을 수정했어요'
    : form.visibility === 'private'
      ? '비공개 파티를 만들었어요'
      : '파티를 올렸어요';
  const main = editing || invited === 0 ? done : `${done} · ${String(invited)}명에게 초대 요청`;
  return missed === 0 ? main : `${main} · ${String(missed)}명은 초대하지 못했어요`;
}

// An edit: the Quest's fields, what the phone keeps, then the time and place of its plan.
async function change(quest: ShownQuest, form: PartyForm, plan: PlanChange | null): Promise<void> {
  const fields = { ...changeOf(quest, form), ...entriesChangeOf(quest, form) };
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
async function recruitFor(attended: Quest, form: PartyForm): Promise<void> {
  await apiClient.changeQuest(attended.id, recruitingOf(attended, form));
  const meeting = meetingOf(form);
  if (meeting !== null) {
    await apiClient.addSubQuest(attended.id, meeting, newIdempotencyKey());
  }
}

// What sending did: `taken`, `refused` with the form kept, or `room` when a step after attending the event failed and
// the Quest stays, which its room finishes.
export type Sent = 'taken' | 'refused' | 'room';

// What sending did, with the Quest it made or changed and the words of its toast. Whoever sends shows the toast and
// moves on: the form, or the chat's Proposal card.
export type Sending = { sent: 'refused'; toast: string } | { sent: 'taken' | 'room'; questId: string; toast: string };

// Sends the form: makes the Quest, for an event by attending it, or changes it, then invites the chosen Friends. The
// photo and the tags go with it, and the phone keeps them. It shows nothing and goes nowhere.
export function useSendParty(
  quest: ShownQuest | null,
): (form: PartyForm, friends: readonly string[], plan: PlanChange | null) => Promise<Sending> {
  const queryClient = useQueryClient();
  const refetch = (): void => {
    for (const queryKey of [QUESTS_KEY, RECRUITING_KEY, SENT_INVITATIONS_KEY]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
  return async (form, friends, plan) => {
    let questId: string;
    let attended: Quest | null = null;
    const entries = { photo: form.photo, tags: form.tags };
    try {
      if (quest !== null) {
        await change(quest, form, plan);
        questId = quest.id;
      } else if (form.event === null) {
        questId = (await apiClient.makeQuest({ ...makingOf(form), ...entries }, newIdempotencyKey())).id;
      } else {
        attended = await apiClient.attendGlobalEvent(form.event.id, attendingTitleOf(form), entries);
        questId = attended.id;
      }
    } catch (error) {
      return { sent: 'refused', toast: refusalWords(error, {}, NOT_SAVED) };
    }
    if (attended !== null) {
      try {
        await recruitFor(attended, form);
      } catch (error) {
        refetch();
        return { sent: 'room', questId, toast: refusalWords(error, {}, NOT_SAVED) };
      }
    }
    const missed = await invite(questId, friends);
    refetch();
    return { sent: 'taken', questId, toast: toastOf(form, quest !== null, friends.length - missed, missed) };
  };
}

// The form's sending: its toast, and the room when the Quest stays after a failed step.
export function useSend(
  quest: ShownQuest | null,
): (form: PartyForm, friends: string[], plan: PlanChange | null) => Promise<Sent> {
  const sendParty = useSendParty(quest);
  const showToast = useToast();
  return async (form, friends, plan) => {
    const sending = await sendParty(form, friends, plan);
    showToast(sending.toast);
    if (sending.sent === 'room') {
      router.replace(`/room/${sending.questId}`);
    }
    return sending.sent;
  };
}

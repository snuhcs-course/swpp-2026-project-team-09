import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { newIdempotencyKey } from '@/api/idempotency-key';
import { QUESTS_KEY, RECRUITING_KEY, SENT_INVITATIONS_KEY } from '@/api/queries';
import type { Quest } from '@/api/types';
import { useToast } from '@/design-system';
import { changeOf, makingOf, meetingOf, type PartyForm, recruitingOf } from '@/features/party/making';
import { refusalWords } from '@/features/quests/refusals';

const NOT_SAVED = '저장하지 못했어요. 다시 시도해 주세요';

// Invites each Friend and counts those the main server refused.
async function invite(questId: string, friends: readonly string[]): Promise<number> {
  const answers = await Promise.allSettled(friends.map((userId) => apiClient.inviteToQuest(questId, userId)));
  return answers.filter(({ status }) => status === 'rejected').length;
}

function toastOf(form: PartyForm, editing: boolean, invited: number, missed: number): string {
  const main = editing
    ? '모집글을 수정했어요'
    : form.visibility === 'private'
      ? `비공개 파티를 만들었어요 · ${String(invited)}명에게 초대 요청`
      : '파티를 올렸어요';
  return missed === 0 ? main : `${main} · ${String(missed)}명은 초대하지 못했어요`;
}

// With an event, the Quest is the one attending it gives, which the form then changes: the recruiting, and `모이기`
// when the User meets before the event.
async function recruitFor(questId: string, form: PartyForm): Promise<void> {
  await apiClient.changeQuest(questId, recruitingOf(form));
  const meeting = meetingOf(form);
  if (meeting !== null) {
    await apiClient.addSubQuest(questId, meeting, newIdempotencyKey());
  }
}

// What sending did: `taken`, `refused` with the form kept, or `room` when a step after attending the event failed and
// the Quest stays, which its room finishes.
export type Sent = 'taken' | 'refused' | 'room';

// Sends the form: makes the Quest, for an event by attending it, or changes it, then invites the chosen Friends.
export function useSend(quest: Quest | null): (form: PartyForm, friends: string[]) => Promise<Sent> {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const refetch = (): void => {
    for (const queryKey of [QUESTS_KEY, RECRUITING_KEY, SENT_INVITATIONS_KEY]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
  return async (form, friends) => {
    let questId: string;
    try {
      if (quest !== null) {
        const change = changeOf(quest, form);
        if (Object.keys(change).length > 0) {
          await apiClient.changeQuest(quest.id, change);
        }
        questId = quest.id;
      } else if (form.event === null) {
        questId = (await apiClient.makeQuest(makingOf(form), newIdempotencyKey())).id;
      } else {
        questId = (await apiClient.attendGlobalEvent(form.event.id)).id;
      }
    } catch (error) {
      showToast(refusalWords(error, {}, NOT_SAVED));
      return 'refused';
    }
    if (quest === null && form.event !== null) {
      try {
        await recruitFor(questId, form);
      } catch (error) {
        showToast(refusalWords(error, {}, NOT_SAVED));
        refetch();
        router.replace(`/room/${questId}`);
        return 'room';
      }
    }
    const missed = await invite(questId, friends);
    showToast(toastOf(form, quest !== null, friends.length - missed, missed));
    refetch();
    return 'taken';
  };
}

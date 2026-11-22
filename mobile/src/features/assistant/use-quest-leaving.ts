/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { ReplyOffer } from '@/api/assistant-types';
import type { LeaveQuestOffer } from '@/api/leave-quest-types';
import { apiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import { myUserId } from '@/auth/sign-in';
import { MY_PARTY_KEY, PARTIES_KEY, QUESTS_KEY, SENT_INVITATIONS_KEY } from '@/api/queries';
import { leavingOnPurpose } from '@/features/quests/leaving';
import { outOfParty } from '@/features/quests/out-of-party';
import { objectParticle } from '@/features/map/short-name';
import { koreaClock, koreaDayWord, koreaWeekdayName } from '@/korea-time';
import { turnsOf } from './turn';
import type { ChatBubble } from './use-chat';

// "저녁 약속 취소해 줘" (P04 ticket 24): the reply's one button cancels the Quest, as the room's 나가기 does
// (DELETE /quests/{questId}). Once it is taken the answer's line says so and the button goes; when it fails the line
// says so and the button stays.

export type LeaveState = 'sending' | 'left' | 'failed';

export interface QuestLeaving {
  // How the offer of that bubble stands, null before its press.
  stateOf: (bubbleId: number, questId: string) => LeaveState | null;
  leave: (bubbleId: number, offer: LeaveQuestOffer) => void;
}

function isLeave(offer: ReplyOffer): offer is LeaveQuestOffer {
  return offer.kind === 'leave-quest';
}

export function leaveOfferOf(bubble: ChatBubble): LeaveQuestOffer | null {
  return bubble.offers?.find((offer) => isLeave(offer)) ?? null;
}

// The leave offer of the latest turn's reply, with its bubble: none while the next reply is on its way.
export function leaveOnScreen(bubbles: readonly ChatBubble[]): { bubbleId: number; offer: LeaveQuestOffer } | null {
  for (const bubble of turnsOf(bubbles).at(-1)?.after ?? []) {
    const offer = leaveOfferOf(bubble);
    if (offer !== null) {
      return { bubbleId: bubble.id, offer };
    }
  }
  return null;
}

// "오늘(일) 18:00", "내일(월) 12:30": what the button says of the Quest's start.
export function leaveWhen(startsAt: string, now: Date): string {
  const day = koreaDayWord(startsAt, now);
  return `${day === '' ? `오늘(${koreaWeekdayName(new Date(startsAt))})` : day} ${koreaClock(startsAt)}`;
}

function cancels({ label }: LeaveQuestOffer): boolean {
  return label !== '나가기';
}

// The line in place of the model's question once the press was answered: null before it, and while it is on its way.
export function leaveWordsOf(offer: LeaveQuestOffer, state: LeaveState | null): string | null {
  if (state === 'left') {
    return cancels(offer)
      ? `‘${offer.title}’${objectParticle(offer.title)} 취소했어요`
      : `‘${offer.title}’에서 나왔어요`;
  }
  if (state === 'failed') {
    return cancels(offer) ? '취소하지 못했어요. 다시 눌러 주세요' : '나가지 못했어요. 다시 눌러 주세요';
  }
  return null;
}

// As the room's 나가기 and 파티 없애기 do, with their `outOfParty`, the User first gets out of the Quest's live 파티, so that
// sharing a position with its members stops (PR 454's review): its Leader ends it when the Quest is cancelled for
// all, and anyone else leaves it.
async function outOfItsParty(questId: string, forAll: boolean): Promise<void> {
  const party = await apiClient.getMyParty();
  if (party?.quest?.id !== questId) {
    return;
  }
  const leads = party.members.some(({ id, leader }) => id === myUserId() && leader);
  await outOfParty(leads ? 'leads' : 'member', forAll);
}

// Whether the Quest is gone: a Quest already gone (404) is as good as left.
async function dropped({ questId, label }: LeaveQuestOffer): Promise<boolean> {
  try {
    await outOfItsParty(questId, label !== '나가기');
    await apiClient.dropQuest(questId);
    return true;
  } catch (error) {
    return isRefusal(error, 404, 'QUEST_NOT_FOUND');
  }
}

function placeOf(bubbleId: number, questId: string): string {
  return `${String(bubbleId)}:${questId}`;
}

export function useQuestLeaving(): QuestLeaving {
  const queryClient = useQueryClient();
  const [states, setStates] = useState<ReadonlyMap<string, LeaveState>>(new Map());
  const stateOf = useCallback(
    (bubbleId: number, questId: string) => states.get(placeOf(bubbleId, questId)) ?? null,
    [states],
  );
  const leave = useCallback(
    (bubbleId: number, offer: LeaveQuestOffer): void => {
      const { questId } = offer;
      const place = placeOf(bubbleId, questId);
      const mark = (state: LeaveState): void => {
        setStates((last) => new Map(last).set(place, state));
      };
      mark('sending');
      void leavingOnPurpose(questId, () => dropped(offer)).then((left) => {
        mark(left ? 'left' : 'failed');
        if (left) {
          for (const queryKey of [QUESTS_KEY, MY_PARTY_KEY, PARTIES_KEY, SENT_INVITATIONS_KEY]) {
            void queryClient.invalidateQueries({ queryKey });
          }
        }
      });
    },
    [queryClient],
  );
  return { stateOf, leave };
}

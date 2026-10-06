import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import { newIdempotencyKey } from '@/api/idempotency-key';
import { MEETUPS_KEY, meetupsQuery, QUESTS_KEY } from '@/api/queries';
import type { Meetup, MeetupProposal } from '@/api/waiting-types';
import { now } from '@/clock';
import { useToast } from '@/design-system';
import { NOT_DONE } from '@/features/quests/refusals';
import { type MeetupDraft, proposalOf, proposeRefusalWords, wasAnswered } from './meetup-form';
import { invitesOf } from './meetup-view';

export function useMeetupInvites(): ReturnType<typeof useQuery<{ received: Meetup[]; sent: Meetup[] }>> {
  return useQuery({ ...meetupsQuery, select: (meetups) => invitesOf(meetups, now()) });
}

const GONE = '이미 취소됐거나 지난 초대예요';

function answerWords(error: unknown): string {
  return isRefusal(error, 409, 'MEETUP_NOT_PROPOSED') || isRefusal(error, 404, 'MEETUP_NOT_FOUND') ? GONE : NOT_DONE;
}

function withdrawWords(error: unknown): string {
  return isRefusal(error, 409, 'MEETUP_NOT_PROPOSED') ? '이미 답한 초대예요' : NOT_DONE;
}

export interface MeetupAnswers {
  // The Meetup whose answer is on its way.
  busy: string | null;
  accept: (meetup: Meetup) => void;
  decline: (meetup: Meetup) => void;
  withdraw: (meetup: Meetup) => void;
}

// 수락, 거절 and 초대 취소, each with its toast. Done or refused, the Meetups are fetched again, and the Quests after
// an accept.
export function useMeetupAnswers(): MeetupAnswers {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = (
    meetup: Meetup,
    ask: (id: string) => Promise<void>,
    done: string | null,
    words: typeof answerWords,
  ): void => {
    setBusy(meetup.id);
    ask(meetup.id)
      .then(
        () => {
          if (done !== null) {
            showToast(done);
          }
        },
        (error: unknown) => {
          showToast(words(error));
        },
      )
      .finally(() => {
        setBusy(null);
        void queryClient.invalidateQueries({ queryKey: MEETUPS_KEY });
        void queryClient.invalidateQueries({ queryKey: QUESTS_KEY });
      });
  };
  return {
    busy,
    accept: (meetup) => {
      run(meetup, apiClient.acceptMeetup, '파티에 참여했어요', answerWords);
    },
    decline: (meetup) => {
      run(meetup, apiClient.declineMeetup, null, answerWords);
    },
    withdraw: (meetup) => {
      run(meetup, apiClient.withdrawMeetup, `${meetup.receiver.name}님 초대를 취소했어요`, withdrawWords);
    },
  };
}

// Sends the form's proposal. One key is kept for the same proposal until the main server answers, so that a retry
// after no answer cannot propose twice. True once it was proposed; a refusal says why in a toast.
export function useProposeMeetup(friend: { id: string; name: string }): {
  sending: boolean;
  send: (draft: MeetupDraft) => Promise<boolean>;
} {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [sending, setSending] = useState(false);
  const held = useRef<{ proposal: string; key: string } | null>(null);
  const keyFor = (proposal: MeetupProposal): string => {
    const words = JSON.stringify(proposal);
    if (held.current?.proposal !== words) {
      held.current = { proposal: words, key: newIdempotencyKey() };
    }
    return held.current.key;
  };
  const send = async (draft: MeetupDraft): Promise<boolean> => {
    const proposal = proposalOf(friend.id, draft);
    if (proposal === null) {
      return false;
    }
    setSending(true);
    try {
      await apiClient.proposeMeetup(proposal, keyFor(proposal));
      held.current = null;
      showToast(`${friend.name}님에게 파티 초대를 보냈어요`);
      return true;
    } catch (error) {
      if (wasAnswered(error)) {
        held.current = null;
      }
      showToast(proposeRefusalWords(error, friend.name));
      return false;
    } finally {
      setSending(false);
      void queryClient.invalidateQueries({ queryKey: MEETUPS_KEY });
    }
  };
  return { sending, send };
}

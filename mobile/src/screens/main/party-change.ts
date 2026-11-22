/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import type { ProposalChange } from '@/api/party-change-types';
import type { SubQuestPlace } from '@/api/room-types';
import type { SubQuest } from '@/api/types';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { refusalWords } from '@/features/quests/refusals';
import type { ProposalActions } from './chat-cards';
import type { ProposalMaking } from './chat-proposal-card';

// 바꾸기 of a 파티 already made (P04 ticket 25), and the step it was worked out from (ticket 27): the step is read when
// the change comes and again on 바꾸기, which sends nothing when they differ.

const STALE_CHANGE = '파티가 그사이 바뀌었어요. 다시 물어봐 주세요';

// What a change rests on: the step's time, end, and place.
function stepKeyOf({ startsAt, endsAt, place }: SubQuest): string {
  return JSON.stringify([startsAt, endsAt, place?.placeId ?? null, place?.label ?? null]);
}

// The step as it stands now, null when it cannot be read or is gone.
async function readStep({ questId, subQuestId }: ProposalChange): Promise<SubQuest | null> {
  try {
    const quest = await apiClient.getQuest(questId);
    return quest.subQuests.find(({ id }) => id === subQuestId) ?? null;
  } catch {
    return null;
  }
}

// Whether the step still stands as it did when the change came. With no step read then, or none read now, there is
// nothing to hold the change against, and the main server's own checks decide.
async function unchanged(made: ProposalChange, baseline: SubQuest | null): Promise<boolean> {
  if (baseline === null) {
    return true;
  }
  const now = await readStep(made);
  return now === null || stepKeyOf(now) === stepKeyOf(baseline);
}

// The main server sends a step with no place as null, which the type leaves out.
function samePlace(sent: SubQuestPlace | null | undefined, kept: SubQuest['place']): boolean {
  if (sent === undefined || sent === null || kept === null) {
    return (sent === undefined || sent === null) && kept === null;
  }
  return 'placeId' in sent ? sent.placeId === kept.placeId : 'label' in sent && sent.label === kept.label;
}

// The card's rows a change moves (P04 ticket 28), against the step read when it came: none while it is not read.
export function movedRows({ step }: ProposalChange, kept: SubQuest | null): string[] {
  if (kept === null) {
    return [];
  }
  const sameTime = kept.startsAt !== null && Date.parse(step.startsAt) === Date.parse(kept.startsAt);
  return [...(sameTime ? [] : ['언제']), ...(samePlace(step.place, kept.place) ? [] : ['어디서'])];
}

// The step of each bubble's change as read when it came, by bubble.
export function useStepBaselines(bubbles: readonly ChatBubble[]): (bubbleId: number) => SubQuest | null {
  const asked = useRef(new Set<number>());
  const [baselines, setBaselines] = useState<ReadonlyMap<number, SubQuest | null>>(new Map());
  useEffect(() => {
    for (const { id, proposal } of bubbles) {
      const change = proposal?.change;
      if (change !== undefined && !asked.current.has(id)) {
        asked.current.add(id);
        void readStep(change).then((step) => {
          setBaselines((last) => new Map(last).set(id, step));
        });
      }
    }
  }, [bubbles]);
  return (bubbleId) => baselines.get(bubbleId) ?? null;
}

// 바꾸기 on an earlier turn reopened from the pill's list (PR 456's review): its change may undo a newer one.
const EARLIER_CHANGE = '지난 답이에요. 마지막 답에서 바꿔 주세요';

// The toast once 바꾸기 changed a made 파티 (P04 ticket 25), with how many it told.
export function changedWords({ told }: ProposalChange): string {
  return told > 0 ? `파티를 바꿨어요. 참여한 ${String(told)}명에게 알렸어요` : '파티를 바꿨어요';
}

// 바꾸기 sends the main server's step as it is to the room's 일정 수정: true once it is taken.
function changeParty({ questId, subQuestId, step }: ProposalChange, say: (words: string) => void): Promise<boolean> {
  return apiClient.editSubQuest(questId, subQuestId, step).then(
    () => true,
    (error: unknown) => {
      say(refusalWords(error));
      return false;
    },
  );
}

interface Changing {
  sending: Set<number>;
  mark: (bubbleId: number, state: ProposalMaking) => void;
  say: (words: string) => void;
  onMade: (bubbleId: number, questId: string) => void;
  latest: boolean;
  // The step as it stood when the bubble's change came, null when it could not be read.
  baselineOf: (bubbleId: number) => SubQuest | null;
}

// 바꾸기 of a bubble's change: on its way, then changed, the 파티 going back as made, or ready again. A step changed
// since the change came (in the room, or by another change) is not overwritten: the card says so and takes no press.
function changeWith({
  sending,
  mark,
  say,
  onMade,
  latest,
  baselineOf,
}: Changing): (bubbleId: number, made: ProposalChange) => void {
  return (bubbleId, made) => {
    if (!latest) {
      say(EARLIER_CHANGE);
      return;
    }
    if (sending.has(bubbleId)) {
      return;
    }
    sending.add(bubbleId);
    mark(bubbleId, 'making');
    void unchanged(made, baselineOf(bubbleId)).then(async (still) => {
      if (!still) {
        sending.delete(bubbleId);
        mark(bubbleId, 'stale');
        say(STALE_CHANGE);
        return;
      }
      const changed = await changeParty(made, say);
      sending.delete(bubbleId);
      mark(bubbleId, changed ? 'made' : 'ready');
      if (changed) {
        say(changedWords(made));
        onMade(bubbleId, made.questId);
      }
    });
  };
}

// A made 파티's change (P04 ticket 25): 바꾸기 changes it in place, and 파티 보기 opens its room.
export function withChanges(actions: ProposalActions, changing: Changing): ProposalActions {
  const change = changeWith(changing);
  const { baselineOf } = changing;
  return {
    ...actions,
    movedOf: (bubbleId, { change: made }) => (made === undefined ? [] : movedRows(made, baselineOf(bubbleId))),
    make: (bubbleId, proposal) => {
      if (proposal.change === undefined) {
        actions.make(bubbleId, proposal);
      } else {
        change(bubbleId, proposal.change);
      }
    },
    edit: (bubbleId, proposal) => {
      if (proposal.change === undefined) {
        actions.edit(bubbleId, proposal);
      } else {
        router.push(`/room/${proposal.change.questId}`);
      }
    },
  };
}

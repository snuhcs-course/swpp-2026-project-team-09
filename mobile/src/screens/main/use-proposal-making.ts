/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { QuestProposal } from '@/api/assistant-types';
import { globalEventAnnouncersQuery } from '@/api/queries';
import { now } from '@/clock';
import { useToast } from '@/design-system';
import { holdProposal } from '@/features/party/held-proposal';
import { isReady, type PartyForm, proposalForm } from '@/features/party/making';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { useSendParty } from '../party/form/use-send';
import { showMine } from '../party/use-party-actions';
import type { ProposalActions } from './chat-cards';
import type { ProposalMaking } from './chat-proposal-card';
import { changeWith, useStepBaselines, withChanges } from './party-change';

const NOT_READY = '빠진 내용이 있어요. 채팅으로 알려 주세요';
const STARTED = '시작 시간이 지났어요. 새 시간을 채팅으로 알려 주세요';

// Why a Proposal cannot be sent as it stands, checked again on the phone before 만들기: the form's own readiness, and a
// start that has passed since the Assistant proposed it, which the main server would take.
function blockOf(proposal: QuestProposal, form: PartyForm): string | null {
  if (!isReady(form, proposal.invitees.length, false)) {
    return NOT_READY;
  }
  return form.startsAt !== null && new Date(form.startsAt) <= now() ? STARTED : null;
}

// Opens the party form filled with the Proposal, which tells `made` once it made the Quest.
export function openProposalForm(proposal: QuestProposal, made: (questId: string) => void): void {
  holdProposal({ proposal, made });
  router.push({ pathname: '/party-form', params: { fromProposal: '1' } });
}

// 만들기 on a Proposal card: makes the Quest the way the party form does, attending its event and inviting its Friends,
// and shows the form's toast. Made, it goes where the form goes after making, 내 파티, or to the room when a step after
// attending the event failed; refused, the card can be pressed again. A Proposal is made once: its card then says so,
// and a second press while it is on its way does nothing.
// A Quest made in the form 수정 opens counts as made here too, so that the card does not make it again; coming back
// without making leaves the card as it was.
// `onMade` tells the chat the Quest a bubble's Proposal was made into, which goes back with it (P04 ticket 19).
type Made = (bubbleId: number, questId: string) => void;

interface Kept {
  latest: boolean;
  bubbles: readonly ChatBubble[];
}

const EVERY_TURN: Kept = { latest: true, bubbles: [] };

// `latest` is false while an earlier turn is reopened from the pill's list, where a change of a made 파티 is not sent.
// `bubbles` are the conversation's, whose changes of a made 파티 keep the step they were worked out from.
export function useProposalMaking(onMade: Made, { latest, bubbles }: Kept = EVERY_TURN): ProposalActions {
  const sendParty = useSendParty(null);
  const showToast = useToast();
  const announcers = useQuery(globalEventAnnouncersQuery).data;
  const [making, setMaking] = useState<ReadonlyMap<number, ProposalMaking>>(new Map());
  // The bubbles whose 만들기 is on its way, before a render disables their button.
  const sending = useRef(new Set<number>());
  const mark = useCallback((bubbleId: number, state: ProposalMaking): void => {
    setMaking((held) => new Map(held).set(bubbleId, state));
  }, []);
  const baselineOf = useStepBaselines(bubbles);
  const change = changeWith({ sending: sending.current, mark, say: showToast, onMade, latest, baselineOf });
  const make = (bubbleId: number, proposal: QuestProposal): void => {
    if (sending.current.has(bubbleId)) {
      return;
    }
    const form = proposalForm(proposal, announcers);
    const blocked = blockOf(proposal, form);
    if (blocked !== null) {
      showToast(blocked);
      return;
    }
    sending.current.add(bubbleId);
    mark(bubbleId, 'making');
    const invitees = proposal.invitees.map(({ id }) => id);
    void sendParty(form, invitees, null).then((sent) => {
      showToast(sent.toast);
      if (sent.sent === 'refused') {
        sending.current.delete(bubbleId);
        mark(bubbleId, 'ready');
        return;
      }
      mark(bubbleId, 'made');
      onMade(bubbleId, sent.questId);
      if (sent.sent === 'room') {
        router.navigate(`/room/${sent.questId}`);
      } else {
        showMine();
      }
    });
  };
  const edit = (bubbleId: number, proposal: QuestProposal): void => {
    openProposalForm(proposal, (questId) => {
      mark(bubbleId, 'made');
      onMade(bubbleId, questId);
    });
  };
  return withChanges({ makingOf: (bubbleId) => making.get(bubbleId) ?? 'ready', make, edit }, change);
}

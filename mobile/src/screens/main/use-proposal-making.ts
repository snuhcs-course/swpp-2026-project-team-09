/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
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
import { useSendParty } from '../party/form/use-send';
import { showMine } from '../party/use-party-actions';
import type { ProposalActions } from './chat-cards';
import type { ProposalMaking } from './chat-proposal-card';

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

// Closes the sheet and opens the party form filled with the Proposal, which tells `made` once it made the Quest.
export function openProposalForm(proposal: QuestProposal, made: () => void, close: () => void): void {
  holdProposal({ proposal, made });
  close();
  router.push({ pathname: '/party-form', params: { fromProposal: '1' } });
}

// 만들기 on a Proposal card: makes the Quest the way the party form does, attending its event and inviting its Friends,
// and shows the form's toast. Made, it closes the sheet and goes where the form goes after making, 내 파티, or to the
// room when a step after attending the event failed; refused, the sheet stays and the card can be pressed again. A
// Proposal is made once: its card then says so, and a second press while it is on its way does nothing. The state
// lives with the conversation, so that closing the sheet keeps it.
// A Quest made in the form 수정 opens counts as made here too, so that the card does not make it again; coming back
// without making leaves the card as it was.
export function useProposalMaking(close: () => void): ProposalActions {
  const sendParty = useSendParty(null);
  const showToast = useToast();
  const announcers = useQuery(globalEventAnnouncersQuery).data;
  const [making, setMaking] = useState<ReadonlyMap<number, ProposalMaking>>(new Map());
  // The bubbles whose 만들기 is on its way, before a render disables their button.
  const sending = useRef(new Set<number>());
  const mark = useCallback((bubbleId: number, state: ProposalMaking): void => {
    setMaking((held) => new Map(held).set(bubbleId, state));
  }, []);
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
      close();
      if (sent.sent === 'room') {
        router.navigate(`/room/${sent.questId}`);
      } else {
        showMine();
      }
    });
  };
  const edit = (bubbleId: number, proposal: QuestProposal): void => {
    openProposalForm(
      proposal,
      () => {
        mark(bubbleId, 'made');
      },
      close,
    );
  };
  return { makingOf: (bubbleId) => making.get(bubbleId) ?? 'ready', make, edit };
}

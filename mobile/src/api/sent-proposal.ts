/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { QuestProposal } from './assistant-types';

// A Proposal as it is sent back: its Global Event by id and title, as a card goes back by reference, and once 만들기
// made it, the made Quest's id (P05 ticket 18), so that the Assistant does not offer it again. A main server before
// P05 ticket 18 refuses the key, so the app that sends it is published after that server.
export type SentProposal = Omit<QuestProposal, 'globalEvent'> & {
  globalEvent: { id: string; title: string } | null;
  madeQuestId?: string;
};

export function sentProposalOf(proposal: QuestProposal, madeQuestId?: string): SentProposal {
  const { globalEvent } = proposal;
  const event = globalEvent === null ? null : { id: globalEvent.id, title: globalEvent.title };
  return madeQuestId === undefined
    ? { ...proposal, globalEvent: event }
    : { ...proposal, globalEvent: event, madeQuestId };
}

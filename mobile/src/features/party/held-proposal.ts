/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { QuestProposal } from '@/api/assistant-types';

// The Proposal whose 수정 opens the party form. A route carries words only, and the main server never stores a
// Proposal, so the chat holds it here and then opens `/party-form?fromProposal=1`, which reads it, as the map view
// gives its place back through `waitForPlace`.
export interface HeldProposal {
  proposal: QuestProposal;
  // The form made the Quest, by its id: the chat's card then says so, and the Proposal goes back with the id.
  made: (questId: string) => void;
}

let held: HeldProposal | null = null;

export function holdProposal(proposal: HeldProposal): void {
  held = proposal;
}

// The Proposal held last, kept until another is held, so that the form finds it each time it draws.
export function heldProposal(): HeldProposal | null {
  return held;
}

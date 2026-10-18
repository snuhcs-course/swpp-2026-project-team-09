/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { QuestProposal } from '@/api/assistant-types';

// The Proposal whose 수정 opens the party form. A route carries words only, and the main server never stores a
// Proposal, so the chat holds it here and then opens `/party-form?fromProposal=1`, which reads it, as the map view
// gives its place back through `waitForPlace`.
export interface HeldProposal {
  proposal: QuestProposal;
  // The form made the Quest: the chat's card then says so.
  made: () => void;
}

let held: HeldProposal | null = null;

export function holdProposal(proposal: HeldProposal): void {
  held = proposal;
}

// The Proposal held last, kept until another is held, so that the form finds it each time it draws.
export function heldProposal(): HeldProposal | null {
  return held;
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type SentMessage } from '../test/assistant.js';
import { type CaseProposal, type CaseTurn } from './cases.ts';
import { seedOf, type World } from './world.ts';

export type SentAssistant = Extract<SentMessage, { role: 'assistant' }>;

function sentProposalOf(proposal: CaseProposal, world: World): SentAssistant['proposal'] {
  const { place, globalEvent, invitees, ...values } = proposal;
  return {
    ...values,
    place: place === null ? null : { id: seedOf(world.seeds, 'place', place).id, name: place },
    globalEvent:
      globalEvent === null ? null : { id: seedOf(world.seeds, 'globalEvent', globalEvent).id, title: globalEvent },
    invitees: invitees.map((name) => ({ id: seedOf(world.seeds, 'friend', name).id, name })),
  };
}

// A case's turns as the app sends them, its seed names turned into the world's ids.
export function requestMessages(turns: readonly CaseTurn[], world: World): SentMessage[] {
  return turns.map((turn): SentMessage => {
    if ('user' in turn) {
      const { user, chosen } = turn;
      return chosen === undefined
        ? { role: 'user', text: user }
        : {
            role: 'user',
            text: user,
            chosen: { kind: chosen.kind, id: seedOf(world.seeds, chosen.kind, chosen.seed).id, words: chosen.words },
          };
    }
    const { text, cards, proposal } = turn.assistant;
    return {
      role: 'assistant',
      text,
      cards: cards.map(({ kind, seed }) => ({ kind, id: seedOf(world.seeds, kind, seed).id })),
      proposal: proposal === null ? null : sentProposalOf(proposal, world),
    };
  });
}

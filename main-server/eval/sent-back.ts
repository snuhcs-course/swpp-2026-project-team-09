/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type AssistantReplyDto } from '../src/assistant/dto/assistant-messages.dto.js';
import { sentProposalOf as sentBackProposal } from '../src/assistant/proposal.js';
import { idOf } from '../src/assistant/tools/fresh-ids.js';
import { type SentMessage } from '../test/assistant.js';

// What a live case sends back after each reply, as the app does: the reply in the conversation, and the answer on
// screen when the case carries it.

type SentAssistant = Extract<SentMessage, { role: 'assistant' }>;

// The answer on screen a live case's next turn sends, as the app does (P05 ticket 51).
export interface OnScreen {
  conditions: AnswerReply['input'];
  planId: string | null;
  planIds: string[];
}

// The answer on screen after a reply: its own answer at its first plan, or the one before with the plan it chose.
export function onScreenAfter(last: OnScreen | null, { answer, select }: AssistantReplyDto): OnScreen | null {
  if (answer !== null) {
    const planIds = answer.plans.map(({ id }) => id);
    return { conditions: answer.input, planId: planIds[0] ?? null, planIds };
  }
  return last === null || select === undefined ? last : { ...last, planId: select.planId };
}

// The reply sent back with the next message, as the app does: the cards by reference, the Proposal by its values, and
// a reply with no words beside a Lookup by the Lookup's lines, which the User saw.
function sentBack({ text, cards, proposal, lookup }: AssistantReplyDto): SentAssistant {
  const seen = lookup?.lines.map((line) => line.map((part) => part.text).join('')).join('\n') ?? '';
  return {
    role: 'assistant',
    text: text.trim() === '' && seen !== '' ? seen : text,
    cards: cards.map((card) => ({ kind: card.kind, id: idOf(card) })),
    proposal: proposal === null ? null : sentBackProposal(proposal),
  };
}

// Adds the reply to the conversation as the app does, which sends only the last Proposal back.
export function sendBack(messages: SentMessage[], reply: AssistantReplyDto): void {
  if (reply.proposal !== null) {
    for (const message of messages) {
      if (message.role === 'assistant') {
        message.proposal = null;
      }
    }
  }
  messages.push(sentBack(reply));
}

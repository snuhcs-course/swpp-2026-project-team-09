/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { contextLines } from './context-lines.js';
import { type ChatMessage, type Request } from './feature.js';
import { proposalForModel, type SentProposal } from './proposal.js';

// What runFeature (adapter.ts) gives the model of a conversation and makes of its steps' text, apart from the model
// library.

// What the model reads of a message: an Assistant's carries a line naming the cards it showed, and one with the values
// of the Proposal it made, which proposeQuest is given again to change it.
function contentOf(message: ChatMessage): string {
  if (message.role === 'user') {
    return message.text;
  }
  const lines = [message.text];
  if (message.cards.length > 0) {
    lines.push(`[Cards shown: ${message.cards.map(({ kind, id }) => `${kind} ${id}`).join(', ')}]`);
  }
  if (message.proposal !== null) {
    lines.push(`[Proposal shown: ${JSON.stringify(proposalForModel(message.proposal))}]`);
  }
  return lines.join('\n\n');
}

// The conversation as the model reads it, the lines of the request context after the User's new message for an app
// that draws answers.
export function messagesFor(
  messages: readonly ChatMessage[],
  { context, capabilities, ahead = [] }: Request,
): { role: ChatMessage['role']; content: string }[] {
  const last = messages.length - 1;
  const lines = capabilities.includes('answer') ? [...contextLines(context), ...ahead] : [];
  return messages.map((message, index) => ({
    role: message.role,
    content: index === last ? [contentOf(message), ...lines].join('\n\n') : contentOf(message),
  }));
}

// The last Proposal of the conversation, which the app sends back on one message at most.
export function lastShown(messages: readonly ChatMessage[]): SentProposal | null {
  const proposals = messages.map((message) => (message.role === 'assistant' ? message.proposal : null));
  return proposals.findLast((proposal) => proposal !== null) ?? null;
}

// The model may write part of its answer beside a tool call and close with a line in its last step, or write nothing
// there: the reply is every step's text in order, a step that repeats the one before it left out.
export function textOf(steps: readonly { text: string }[]): string {
  const texts = steps.map((step) => step.text.trim()).filter((text) => text !== '');
  return texts.filter((text, index) => index === 0 || text !== texts[index - 1]).join('\n\n');
}

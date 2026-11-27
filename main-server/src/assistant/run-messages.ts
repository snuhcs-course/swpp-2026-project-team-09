/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { contextLines } from './context-lines.js';
import { type CardReference, type ChatMessage, type Request } from './feature.js';
import { clockOfMinutes, minutesOfClock } from './library/booking-rules.js';
import { type Catalogue, roomLabelOf } from './library/catalogue.js';
import { bookKeyOf } from './library/library-card.js';
import { mentionLines } from './mentions.js';
import { proposalForModel, type SentProposal } from './proposal.js';

// What runFeature (adapter.ts) gives the model of a conversation and makes of its steps' text, apart from the model
// library.

// A Proposal not made yet, one made, or the change of a made one that 바꾸기 has not sent: its 파티 is as before.
function proposalLine({ madeQuestId, change, ...proposal }: SentProposal): string {
  if (madeQuestId !== undefined) {
    return `[Proposal made: ${JSON.stringify({ questId: madeQuestId, ...proposalForModel(proposal) })}]`;
  }
  if (change !== undefined) {
    return `[Proposal change shown: ${JSON.stringify({ questId: change.questId, ...proposalForModel(proposal) })}]`;
  }
  return `[Proposal shown: ${JSON.stringify(proposalForModel(proposal))}]`;
}

// A card as the model reads it. The app sends a book card back as the User left it, and on the phone they can change
// its room, time and seat, so its key is written out in words: the model's own earlier words may name another room
// (P05 ticket 60). Any other card, and a book card of a space the catalogue lacks, is its kind and id.
function cardWords({ kind, id }: CardReference, catalogue: Catalogue | undefined): string {
  const book = kind === 'library' ? bookKeyOf(id) : null;
  const space = book === null ? undefined : catalogue?.byId.get(book.spaceId);
  if (book === null || space === undefined) {
    return `${kind} ${id}`;
  }
  const { date, start, minutes, seat } = book;
  const seatWords = seat === undefined ? [] : [`${space.unit === 'room' ? 'room' : 'seat'} ${seat}`];
  const time = `${date.slice(5).replace('-', '/')} ${start}–${clockOfMinutes(minutesOfClock(start) + minutes)}`;
  return [`library card for ${roomLabelOf(space, space.id)}`, ...seatWords, time, 'as the User left it'].join(', ');
}

// What the model reads of a message: an Assistant's carries a line naming the cards it showed, and one with the values
// of the Proposal it made, which proposeQuest is given again to change it, or, once the User made it, with the Quest's
// id, which is no Proposal to change any more.
function contentOf(message: ChatMessage, catalogue: Catalogue | undefined): string {
  if (message.role === 'user') {
    return message.text;
  }
  const lines = [message.text];
  if (message.cards.length > 0) {
    lines.push(`[Cards shown: ${message.cards.map((card) => cardWords(card, catalogue)).join(', ')}]`);
  }
  if (message.proposal !== null) {
    lines.push(proposalLine(message.proposal));
  }
  return lines.join('\n\n');
}

// The conversation as the model reads it, the lines of the request context after the User's new message for an app
// that draws answers. The catalogue names the space of a book card sent back.
export function messagesFor(
  messages: readonly ChatMessage[],
  { context, capabilities, ahead = [] }: Request,
  catalogue?: Catalogue,
): { role: ChatMessage['role']; content: string }[] {
  const last = messages.length - 1;
  const lines = [
    ...mentionLines(context.mentions),
    ...(capabilities.includes('answer') ? [...contextLines(context), ...ahead] : []),
  ];
  return messages.map((message, index) => {
    const content = contentOf(message, catalogue);
    return { role: message.role, content: index === last ? [content, ...lines].join('\n\n') : content };
  });
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

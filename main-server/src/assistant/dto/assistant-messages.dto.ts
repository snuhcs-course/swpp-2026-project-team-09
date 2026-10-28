/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Card, type CardKind, CARDS_MAX, type Choice, type ChoiceKind, type MapLayer } from '../feature.js';
import { proposalLength, type QuestProposal, questProposalSchema } from '../proposal.js';

// The most characters of a User's message, which the app's input also keeps to.
export const USER_MESSAGE_MAX = 1000;
// The most characters of an Assistant's message sent back: more than a reply within its output tokens comes to.
export const ASSISTANT_MESSAGE_MAX = 4000;
// The most characters of a request's messages together, a Proposal's text and names included. The app drops its
// oldest messages to stay within it.
export const MESSAGES_TOTAL_MAX = 24_000;

// The candidate a User's message answers with, sent back from the chip they tapped: its kind and id, and the words it
// was a candidate for, as long as a resolver takes. The server checks the id again before the model reads it.
const chosenSchema = z.strictObject({
  kind: z.enum(['place', 'friend', 'globalEvent'] satisfies ChoiceKind[]),
  id: z.uuid(),
  words: z.string().trim().min(1).max(50),
});

const userMessage = z.strictObject({
  role: z.literal('user'),
  text: z.string().trim().min(1).max(USER_MESSAGE_MAX),
  chosen: chosenSchema.optional(),
});

const assistantMessage = z.strictObject({
  role: z.literal('assistant'),
  text: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX),
  cards: z
    .array(z.strictObject({ kind: z.enum(['quest', 'globalEvent'] satisfies CardKind[]), id: z.uuid() }))
    .max(CARDS_MAX)
    .default([]),
  proposal: questProposalSchema.nullable().default(null),
});

type Message = z.infer<typeof userMessage> | z.infer<typeof assistantMessage>;

function lengthOf(message: Message): number {
  const proposal = message.role === 'assistant' && message.proposal !== null ? proposalLength(message.proposal) : 0;
  return message.text.length + proposal;
}

// The conversation so far, as the app keeps it, the User's new message last. The server stores no message; of a
// chosen candidate, only its id and its words, normalised. A request over a length is refused before the model is
// called.
export const assistantMessagesSchema = z.strictObject({
  messages: z
    .array(z.discriminatedUnion('role', [userMessage, assistantMessage]))
    .min(1)
    .refine((messages) => messages.at(-1)?.role === 'user', "The last message must be the User's")
    .refine(
      (messages) => messages.reduce((total, message) => total + lengthOf(message), 0) <= MESSAGES_TOTAL_MAX,
      `The messages must hold at most ${MESSAGES_TOTAL_MAX} characters together`,
    )
    .refine(
      (messages) => messages.filter((message) => message.role === 'assistant' && message.proposal !== null).length <= 1,
      'Only the last Proposal is sent back',
    ),
});

export type AssistantMessages = z.infer<typeof assistantMessagesSchema>;

export type SentMessage = AssistantMessages['messages'][number];

// The Assistant's reply, whole: its text, the buttons under it that show a layer of the map, each layer once, its
// cards in the order shown, filled from the database, the Proposal it made, if any, and the candidates of every
// 'several' answer of its resolvers, which the app offers as chips. The lists are always there, empty when there are
// none, and the Proposal null.
export interface AssistantReplyDto {
  text: string;
  mapButtons: MapLayer[];
  cards: Card[];
  proposal: QuestProposal | null;
  choices: Choice[];
}

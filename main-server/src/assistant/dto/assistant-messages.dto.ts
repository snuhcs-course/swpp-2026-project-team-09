/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { type Card, CARDS_MAX, type MapLayer } from '../feature.js';

// The most characters of a User's message, which the app's input also keeps to.
export const USER_MESSAGE_MAX = 1000;
// The most characters of an Assistant's message sent back: more than a reply within its output tokens comes to.
export const ASSISTANT_MESSAGE_MAX = 4000;
// The most characters of a request's messages together. The app drops its oldest messages to stay within it.
export const MESSAGES_TOTAL_MAX = 24_000;

const userMessage = z.strictObject({
  role: z.literal('user'),
  text: z.string().trim().min(1).max(USER_MESSAGE_MAX),
});

const assistantMessage = z.strictObject({
  role: z.literal('assistant'),
  text: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX),
  cards: z
    .array(z.strictObject({ kind: z.enum(['quest', 'globalEvent']), id: z.uuid() }))
    .max(CARDS_MAX)
    .default([]),
});

// The conversation so far, as the app keeps it, the User's new message last. The server stores none of it. A request
// over a length is refused before the model is called.
export const assistantMessagesSchema = z.strictObject({
  messages: z
    .array(z.discriminatedUnion('role', [userMessage, assistantMessage]))
    .min(1)
    .refine((messages) => messages.at(-1)?.role === 'user', "The last message must be the User's")
    .refine(
      (messages) => messages.reduce((total, { text }) => total + text.length, 0) <= MESSAGES_TOTAL_MAX,
      `The messages must hold at most ${MESSAGES_TOTAL_MAX} characters together`,
    ),
});

export type AssistantMessages = z.infer<typeof assistantMessagesSchema>;

// The Assistant's reply, whole: its text, the buttons under it that show a layer of the map, each layer once, and its
// cards in the order shown, filled from the database. Both lists are always there, empty when there are none.
export interface AssistantReplyDto {
  text: string;
  mapButtons: MapLayer[];
  cards: Card[];
}

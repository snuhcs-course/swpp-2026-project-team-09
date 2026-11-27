/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Card, type CardKind, CARDS_MAX, CLIENT_CAPABILITIES, type MapLayer } from '../feature.js';
import { isLibraryKey, LIBRARY_KEY_MAX } from '../library/library-card.js';
import {
  type AnswerReply,
  type LeftOutClass,
  type Lookup,
  NO_CONTEXT,
  type ReplyStep,
  requestContextSchema,
} from './answer.dto.js';
import { proposalLength, type QuestProposal, questProposalSchema } from '../proposal.js';
import { type Refusal, type RefusalOffer } from '../refusals/refusal.dto.js';

// The most characters of a User's message, which the app's input also keeps to.
export const USER_MESSAGE_MAX = 1000;
// The most characters of an Assistant's message sent back: more than a reply within its output tokens comes to.
export const ASSISTANT_MESSAGE_MAX = 4000;
// The most characters of a request's messages together, a Proposal's text and names included. The app drops its
// oldest messages to stay within it.
export const MESSAGES_TOTAL_MAX = 24_000;

// A Restaurant's key is its name, not a UUID.
const RESTAURANT_KEY_MAX = 200;

const cardReference = z.union([
  z.strictObject({ kind: z.enum(['quest', 'globalEvent'] satisfies CardKind[]), id: z.uuid() }),
  z.strictObject({ kind: z.literal('restaurant' satisfies CardKind), id: z.string().min(1).max(RESTAURANT_KEY_MAX) }),
  // A library card's key, checked against its grammar and never looked up.
  z.strictObject({
    kind: z.literal('library' satisfies CardKind),
    id: z.string().max(LIBRARY_KEY_MAX).refine(isLibraryKey, 'Expected a library card key'),
  }),
]);

const userMessage = z.strictObject({
  role: z.literal('user'),
  text: z.string().trim().min(1).max(USER_MESSAGE_MAX),
});

const assistantMessage = z.strictObject({
  role: z.literal('assistant'),
  text: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX),
  cards: z.array(cardReference).max(CARDS_MAX).default([]),
  proposal: questProposalSchema.nullable().default(null),
});

type Message = z.infer<typeof userMessage> | z.infer<typeof assistantMessage>;

function lengthOf(message: Message): number {
  const proposal = message.role === 'assistant' && message.proposal !== null ? proposalLength(message.proposal) : 0;
  return message.text.length + proposal;
}

// The conversation so far, as the app keeps it, the User's new message last. The server stores none of it. A request
// over a length is refused before the model is called. `clientCapabilities` says what the app can show beside the
// cards every version shows: 'library' for library cards, 'answer' for an answer drawn on the map. `context` is what
// the app knew as the User asked, each part null when it does not know it.
export const assistantMessagesSchema = z.strictObject({
  clientCapabilities: z.array(z.enum(CLIENT_CAPABILITIES)).max(CLIENT_CAPABILITIES.length).default([]),
  context: requestContextSchema.default(NO_CONTEXT),
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

// The Assistant's reply, whole: its text, the buttons under it that show a layer of the map, each layer once, its
// cards in the order shown, filled from the database, the Proposal it made, if any, and the answer or the Lookup it
// drew on the map, if any. Both lists are always there, empty when there are none, and the Proposal, the answer, and
// the Lookup null.
export interface AssistantReplyDto {
  text: string;
  mapButtons: MapLayer[];
  cards: Card[];
  proposal: QuestProposal | null;
  answer: AnswerReply | null;
  lookup: Lookup | null;
  refusal: Refusal | null;
  // Buttons under the text of a reply that draws nothing; left out when there are none.
  offers?: ReplyOffer[];
  // Each request of a message that asked for two or more, in time order; left out otherwise (P03).
  steps?: ReplyStep[];
  // The plan of the meal answer on screen the User chose in words, which the app shows, keeping the answer and its
  // numbers (P05 ticket 51); left out otherwise, and by a reply that draws an answer of its own.
  select?: { planId: string };
  // The answer on screen leaves the map with its time card and button: the User asked for another plan, or something
  // else, and nothing could be drawn for it (P05 ticket 55). Left out otherwise, and by a reply that draws its own.
  clears?: true;
  // The asker's Classes the conversation leaves out after this message, which the app keeps for the conversation and
  // sends back as `context.skipped` (P05 ticket 70). Given while the request sent some or a tool left one out or put one
  // back, empty once none is left; left out otherwise, when the app keeps what it has.
  skipped?: LeftOutClass[];
}

// A button that opens a 파티's room at its 수정 (P05 ticket 30), sent only to an app that says `party-change`.
export interface QuestOffer {
  kind: 'quest';
  label: string;
  questId: string;
}

// A button that cancels one of the User's Quests, which the app sends as `DELETE /quests/:questId` (P05 ticket 31):
// 취소하기 when nobody else holds it, 나가기 when others do, with the Quest's title and start, which the app shows on it
// so that the press names what it cancels. Sent only to an app that says `quest-cancel`.
export interface LeaveQuestOffer {
  kind: 'leave-quest';
  label: '취소하기' | '나가기';
  title: string;
  startsAt: string;
  questId: string;
}

// A Place picked on the map (P05 ticket 24): a press turns the map into picking, and a tap on a building sends `text` as
// the User's words with that Place tapped. Sent only to an app that says `pick`.
export interface PickPlaceOffer {
  kind: 'pick-place';
  label: string;
  text: string;
}

// A time picked on a wheel on `date` (P05 ticket 24), the asker's Free Time marked from `from` to `until`: a pick sends
// "HH:MM에" as the User's words. Sent only to an app that says `pick`.
export interface PickTimeOffer {
  kind: 'pick-time';
  label: string;
  date: string;
  free: { from: string; until: string }[];
}

// A button under a reply's text: one sent as the User's words, such as a Tutorial quest's 가는 길 보기 (P01-14), one
// that opens a 파티's room, one that cancels a Quest, or a picker of a Place or a time.
export type ReplyOffer =
  Extract<RefusalOffer, { kind: 'ask' }> | QuestOffer | LeaveQuestOffer | PickPlaceOffer | PickTimeOffer;

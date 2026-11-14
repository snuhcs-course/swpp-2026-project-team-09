/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type RequestContext } from './dto/answer.dto.js';
import { type PublishedGlobalEventDto } from '../global-events/dto/global-event.dto.js';
import { type RecruitingQuestDto } from '../quests/dto/quest.dto.js';
import { type FoundIds } from './found-ids.js';
import { type TravelBox } from './free-time/candidate-fit.js';
import { type RestaurantCard } from './free-time/restaurant-card.js';
import { type JudgedCandidates } from './free-time/travel-boxes.js';
import { type LibraryCard } from './library/library-card.js';
import { type QuestProposal, type SentProposal } from './proposal.js';

// The parts of an AI feature that know nothing of the model library (ADR 0005). A tool is a zod schema of its input
// and a plain function that calls the main server's services as the signed-in User. A feature is an entry point with
// its own system prompt and its own set of tools. A new capability of the chat joins it as tools and a prompt fragment
// (ADR 0009), and a Feature of its own only when it has an entry point of its own. `adapter.ts` alone runs them.

// What a card shows: a Quest, a Global Event, a Restaurant or a 관정도서관 action the phone fills from the library.
export type CardKind = 'quest' | 'globalEvent' | 'restaurant' | 'library';

// A card the Assistant showed: what it is and its id, which for a Restaurant and a library card is its key. The model is given only these,
// never the card's data from an earlier message, and calls a tool again when it needs it.
export interface CardReference {
  kind: CardKind;
  id: string;
}

// One message of a conversation, as the app sends it: the User's text, or the Assistant's with the cards it showed and
// the Proposal it made, by its values. Only the last Proposal is sent back.
export type ChatMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; cards: CardReference[]; proposal: SentProposal | null };

// The map layers a reply can show with a button: the restaurants and the shuttle.
export const MAP_LAYERS = ['dining', 'shuttle'] as const;

export type MapLayer = (typeof MAP_LAYERS)[number];

// The most cards one reply shows, which is also the most an Assistant's message may send back.
export const CARDS_MAX = 20;

// A card of the reply, filled by the server in the shape of the list the app already draws it from: a Global Event as
// the 행사 tab's published list serves it, and a Quest as the Boards' recruiting list does.
// A candidate of findFreeTimeEvents also has its 이동 시간 box, which older apps ignore.
export interface GlobalEventCard extends TravelBox {
  kind: 'globalEvent';
  globalEvent: PublishedGlobalEventDto;
}

export interface QuestCard extends TravelBox {
  kind: 'quest';
  quest: RecruitingQuestDto;
}

export type Card = GlobalEventCard | QuestCard | RestaurantCard | LibraryCard;

// What the app says it can show beside the cards every version shows. Library cards are attached only for an app that
// says `library`, since older apps refuse a reply with a card they do not know. `answer`: the app draws an answer on
// the map.
export const CLIENT_CAPABILITIES = ['library', 'answer'] as const;

export type ClientCapability = (typeof CLIENT_CAPABILITIES)[number];

// What the presenters put in the reply beside its text, gathered over one run.
export interface Presented {
  // Each layer once, in the order first shown.
  readonly mapButtons: MapLayer[];
  // Each card once, in the order shown.
  readonly cards: Card[];
  // At most one Proposal: the last that passed proposeQuest.
  proposal: QuestProposal | null;
  // At most one answer drawn on the map: the last a tool put there.
  answer: AnswerReply | null;
}

// Who asks, when, and what their app knew as they asked, such as where they are.
export interface Asker {
  readonly userId: string;
  readonly now: Date;
  readonly context: RequestContext;
}

// Who asks, when, and what their app can show.
export interface Request extends Asker {
  readonly capabilities: readonly ClientCapability[];
}

// What every tool of a run is given: who asks and when, the ids the run's lookups and resolvers returned, which are
// all its presenters accept, the last Proposal sent back with the conversation, whose ids proposeQuest also accepts,
// what the presenters have put in the reply, the candidates findFreeTimeEvents returned so far, and the card of each
// Restaurant findMealRestaurants returned, by its key, in order, and what the User's app can show.
export interface ToolContext extends Asker {
  readonly capabilities: ReadonlySet<ClientCapability>;
  readonly found: FoundIds;
  readonly shown: SentProposal | null;
  readonly presented: Presented;
  readonly judged: JudgedCandidates;
  readonly restaurants: Map<string, RestaurantCard>;
}

// A feature's reply: the text of the model's steps, and what the presenters put beside it.
export interface FeatureReply extends Presented {
  readonly text: string;
  // When no step wrote text and the text is the fixed sentence, how the last step ended, for the server's log.
  readonly noTextFinishReason: string | null;
}

export interface Tool {
  // What the model reads to choose the tool.
  readonly description: string;
  readonly input: z.ZodType;
  // Answers with what the model is given: plain data, or an explicit "none" with the reason.
  readonly run: (input: unknown, context: ToolContext) => Promise<unknown>;
}

// A tool whose function receives its input checked against its schema.
export function defineTool<Schema extends z.ZodType>(definition: {
  description: string;
  input: Schema;
  run: (input: z.output<Schema>, context: ToolContext) => Promise<unknown>;
}): Tool {
  const { description, input, run } = definition;
  return { description, input, run: (value, context) => run(input.parse(value), context) };
}

export interface Feature {
  // The system prompt of a request made at `now`.
  instructions(now: Date): string;
  // By the name the model calls each one.
  readonly tools: Readonly<Record<string, Tool>>;
  // The cards of a run that answered, from what its tools kept. Left out, they stay as the presenters put them.
  cardsAfterRun?(context: ToolContext): Card[];
}

// What a tool answers when nothing matches, so that the model says so instead of answering from elsewhere.
export interface NoneFound {
  result: 'none';
  reason: string;
}

export function noneFound(reason: string): NoneFound {
  return { result: 'none', reason };
}

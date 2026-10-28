/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type PublishedGlobalEventDto } from '../global-events/dto/global-event.dto.js';
import { type AliasSource } from '../places/place-aliases.js';
import { type MatchTier } from '../places/place-index.js';
import { type RecruitingQuestDto } from '../quests/dto/quest.dto.js';
import { type FoundIds } from './found-ids.js';
import { type QuestProposal, type SentProposal } from './proposal.js';

// The parts of an AI feature that know nothing of the model library (ADR 0005). A tool is a zod schema of its input
// and a plain function that calls the main server's services as the signed-in User. A feature is an entry point with
// its own system prompt and its own set of tools. A later AI feature is a new Feature that reuses tools, never more
// tools on another feature, so that one feature cannot reach another's data. `adapter.ts` alone runs them.

// What a card shows: a Quest or a Global Event.
export type CardKind = 'quest' | 'globalEvent';

// A card the Assistant showed: what it is and its id. The model is given only these, never the card's data from an
// earlier message, and calls a tool again when it needs it.
export interface CardReference {
  kind: CardKind;
  id: string;
}

// What a resolver finds: a Place, a Friend or a Global Event.
export type ChoiceKind = 'place' | 'friend' | 'globalEvent';

// A candidate of a resolver's 'several' answer, which the app offers under the reply for the User to tap: its plain
// name or title, and the words the resolver was given, as the model passed them.
export interface Choice {
  kind: ChoiceKind;
  id: string;
  label: string;
  words: string;
}

// A resolver's answer of one candidate read from an alias (P07 ticket 03), which the app shows under the reply as
// "학관 → 학생회관으로 찾았어요" with 아니에요: the words as the model passed them, the candidate's plain name or title,
// and whose alias it was.
export interface ResolvedBy {
  kind: ChoiceKind;
  words: string;
  id: string;
  label: string;
  source: AliasSource;
}

// One message of a conversation, as the server runs it: the User's text, with the candidate it answers with, or the
// Assistant's with the cards it showed and the Proposal it made, by its values. Only the new message's candidate is
// checked again, with its name; an earlier one is as the app sent it back, its text as the name. Only the last
// Proposal is sent back.
export type ChatMessage =
  | { role: 'user'; text: string; chosen: Choice | null }
  | { role: 'assistant'; text: string; cards: CardReference[]; proposal: SentProposal | null };

// The map layers a reply can show with a button: the restaurants and the shuttle.
export const MAP_LAYERS = ['dining', 'shuttle'] as const;

export type MapLayer = (typeof MAP_LAYERS)[number];

// The most cards one reply shows, which is also the most an Assistant's message may send back.
export const CARDS_MAX = 20;

// A card of the reply, filled by the server in the shape of the list the app already draws it from: a Global Event as
// the 행사 tab's published list serves it, and a Quest as the Boards' recruiting list does.
export interface GlobalEventCard {
  kind: 'globalEvent';
  globalEvent: PublishedGlobalEventDto;
}

export interface QuestCard {
  kind: 'quest';
  quest: RecruitingQuestDto;
}

export type Card = GlobalEventCard | QuestCard;

// What the presenters put in the reply beside its text, gathered over one run.
export interface Presented {
  // Each layer once, in the order first shown.
  readonly mapButtons: MapLayer[];
  // Each card once, in the order shown.
  readonly cards: Card[];
  // At most one Proposal: the last that passed proposeQuest.
  proposal: QuestProposal | null;
  // The candidates of every 'several' answer, in the resolvers' order, each once.
  readonly choices: Choice[];
  // Every answer of one candidate read from an alias, each once.
  readonly resolvedBy: ResolvedBy[];
}

// Who asks and when.
export interface Asker {
  readonly userId: string;
  readonly now: Date;
}

// One resolver's answer, as a resolution event records it: the words as the model passed them, and the ids given.
export interface ResolverAnswer {
  kind: ChoiceKind;
  words: string;
  result: 'none' | 'one' | 'several';
  candidateIds: string[];
  // Places only: the matcher's tier that answered. Whose alias it was, when an alias answered.
  tier: MatchTier | null;
  aliasSource: AliasSource | null;
}

// Where a run records how the User's words were resolved (resolution_events). Recording never fails a tool: a row
// that cannot be written is logged and left out.
export interface ResolutionLog {
  answered(answer: ResolverAnswer): Promise<void>;
  // proposeQuest was given a Place other than the one of the Proposal sent back.
  edited(fromPlaceId: string, toPlaceId: string): Promise<void>;
}

// What every tool of a run is given: who asks and when, the ids the run's lookups and resolvers returned and the
// candidate the User chose, which are all its presenters accept, the last Proposal sent back with the conversation,
// whose ids proposeQuest also accepts, what the presenters have put in the reply, and where the resolvers record what
// they answered.
export interface ToolContext extends Asker {
  readonly found: FoundIds;
  readonly shown: SentProposal | null;
  readonly presented: Presented;
  readonly resolutions: ResolutionLog;
}

// A feature's reply: the model's last text, and what the presenters put beside it.
export interface FeatureReply extends Presented {
  readonly text: string;
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
}

// What a tool answers when nothing matches, so that the model says so instead of answering from elsewhere.
export interface NoneFound {
  result: 'none';
  reason: string;
}

export function noneFound(reason: string): NoneFound {
  return { result: 'none', reason };
}

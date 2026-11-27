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
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  ANSWER_CAPABILITIES,
  type AnswerReply,
  type AssistantReply,
  type ChatCard,
  MAP_LAYERS,
  type MapLayer,
  type QuestProposal,
  type ReplyOffer,
  type RestaurantCard,
  type RestaurantTravel,
  type TravelBox,
} from '@/api/assistant-types';
import type { ApiClient } from '@/api/client';
import { field, hasTexts, isBoard, isJoinPolicy, isNothing, isNumber, isText, isTextOrNull, listOf } from './answers';
import { isGlobalEvent } from './event-client';
import { isLibraryCardData, withLibraryDefaults } from './library-card-answers';
import { call } from './http';
import { isMenuLine } from './menu-answers';
import { isRecruitingQuest } from './party-client';
import { isLookup } from './lookup-answers';
import { isAnswerReply } from './plan-answers';
import { isRefusal } from './refusal-answers';
import { isReplyStep } from './step-answers';

// The operation of the AI chat: the conversation goes to the main server, which asks the model. Every request carries
// the context and says that this app draws library cards and an answer on the map (`clientCapabilities`).

function isMapLayer(value: unknown): value is MapLayer {
  return MAP_LAYERS.some((layer) => layer === value);
}

function isTravel(value: unknown): value is TravelBox['travel'] {
  const mode = field(value, 'mode');
  return (mode === 'walk' || mode === 'shuttle') && isNumber(field(value, 'minutes'));
}

function isNext(value: unknown): value is TravelBox['next'] {
  return isNumber(field(value, 'minutes')) && typeof field(value, 'isClass') === 'boolean';
}

// A card's optional fields, those it has being of their shape.
function isTravelBox(value: unknown): value is TravelBox {
  const travel = field(value, 'travel');
  const next = field(value, 'next');
  const leaveBy = field(value, 'leaveBy');
  const endUnknown = field(value, 'endUnknown');
  return (
    (travel === undefined || isTravel(travel)) &&
    (next === undefined || isNext(next)) &&
    (leaveBy === undefined || isText(leaveBy)) &&
    (endUnknown === undefined || typeof endUnknown === 'boolean')
  );
}

// A Place or a Friend of a Proposal: an id and a name.
function isNamed(value: unknown): value is { id: string; name: string } {
  return hasTexts(value, ['id', 'name']);
}

// A made 파티's change (P04 ticket 25): its ids, a step with its title, and how many it tells.
function isChange(value: unknown): boolean {
  const step = field(value, 'step');
  return hasTexts(value, ['questId', 'subQuestId']) && isText(field(step, 'title')) && isNumber(field(value, 'told'));
}

function isQuestProposal(value: unknown): value is QuestProposal {
  const place = field(value, 'place');
  const globalEvent = field(value, 'globalEvent');
  const change = field(value, 'change');
  return (
    (change === undefined || isChange(change)) &&
    hasTexts(value, ['title', 'description', 'startsAt']) &&
    isJoinPolicy(field(value, 'joinPolicy')) &&
    isBoard(field(value, 'board')) &&
    isNumber(field(value, 'capacity')) &&
    (isNothing(place) || isNamed(place)) &&
    (isNothing(globalEvent) || isGlobalEvent(globalEvent)) &&
    listOf(isNamed)(field(value, 'invitees'))
  );
}

function isRestaurantTravel(value: unknown): value is RestaurantTravel {
  const mode = field(value, 'mode');
  const minutes = field(value, 'minutes');
  return (
    isText(field(value, 'name')) &&
    (mode === null || mode === 'walk' || mode === 'shuttle') &&
    (minutes === null || isNumber(minutes)) &&
    typeof field(value, 'longest') === 'boolean'
  );
}

// Absent or null, or both times as "HH:MM".
function isHoursOrAbsent(value: unknown): boolean {
  return value === undefined || value === null || hasTexts(value, ['opensAt', 'closesAt']);
}

function isRestaurant(value: unknown): value is RestaurantCard['restaurant'] {
  const meal = field(value, 'meal');
  return (
    hasTexts(value, ['key', 'name', 'date']) &&
    isTextOrNull(field(value, 'placeNumber')) &&
    (meal === 'lunch' || meal === 'dinner') &&
    isNumber(field(value, 'eatingMinutes')) &&
    listOf(isMenuLine)(field(value, 'lines')) &&
    isHoursOrAbsent(field(value, 'hours')) &&
    listOf(isRestaurantTravel)(field(value, 'people')) &&
    isQuestProposal(field(value, 'proposal'))
  );
}

function isChatCard(value: unknown): value is ChatCard {
  switch (field(value, 'kind')) {
    case 'globalEvent':
      return isGlobalEvent(field(value, 'globalEvent')) && isTravelBox(value);
    case 'quest':
      return isRecruitingQuest(field(value, 'quest')) && isTravelBox(value);
    case 'restaurant':
      return isRestaurant(field(value, 'restaurant'));
    case 'library':
      return isLibraryCardData(field(value, 'library'));
    default:
      return false;
  }
}

function filled(card: ChatCard): ChatCard {
  return card.kind === 'library' ? { kind: 'library', library: withLibraryDefaults(card.library) } : card;
}

// A main server before P01-01 leaves the answer out, one before P01-06 the Lookup, and one before P03 the steps.
function isFree(value: unknown): value is { from: string; until: string } {
  return hasTexts(value, ['from', 'until']);
}

function isReplyOffer(value: unknown): value is ReplyOffer {
  switch (field(value, 'kind')) {
    case 'ask':
      return hasTexts(value, ['label', 'text']);
    case 'leave-quest':
      return hasTexts(value, ['label', 'title', 'startsAt', 'questId']);
    case 'quest':
      return hasTexts(value, ['label', 'questId']);
    case 'pick-place':
      return hasTexts(value, ['label', 'text']);
    case 'pick-time':
      return hasTexts(value, ['label', 'date']) && listOf(isFree)(field(value, 'free'));
    default:
      return false;
  }
}

// An answer of a reply's `answers`, with its request's key (P03 ticket 20).
function isKeyedAnswer(value: unknown): value is AnswerReply {
  return isAnswerReply(value) && isText(field(value, 'key'));
}

function isAssistantReply(value: unknown): value is AssistantReply {
  const answers = field(value, 'answers');
  const withdrawn = field(value, 'withdrawn');
  const offers = field(value, 'offers');
  const proposal = field(value, 'proposal');
  const answer = field(value, 'answer');
  const lookup = field(value, 'lookup');
  const refusal = field(value, 'refusal');
  return (
    hasTexts(value, ['text']) &&
    listOf(isMapLayer)(field(value, 'mapButtons')) &&
    listOf(isChatCard)(field(value, 'cards')) &&
    (isNothing(proposal) || isQuestProposal(proposal)) &&
    (answer === undefined || isNothing(answer) || isAnswerReply(answer)) &&
    (lookup === undefined || isNothing(lookup) || isLookup(lookup)) &&
    (refusal === undefined || isNothing(refusal) || isRefusal(refusal)) &&
    (offers === undefined || listOf(isReplyOffer)(offers)) &&
    (answers === undefined || listOf(isKeyedAnswer)(answers)) &&
    (withdrawn === undefined || listOf(isText)(withdrawn))
  );
}

// Steps this app does not know, from a later main server, are left out whole and the rest of the reply kept, so that
// a partial list never reads as the whole plan.
function knownSteps(steps: unknown): Pick<AssistantReply, 'steps'> {
  return listOf(isReplyStep)(steps) ? { steps } : {};
}

export const assistantClient: Pick<ApiClient, 'askAssistant' | 'recalculateAnswer' | 'answerTap'> = {
  askAssistant: async (messages, context) => {
    const body = { messages, context, clientCapabilities: ANSWER_CAPABILITIES };
    const { steps, ...reply } = await call('POST', '/assistant/messages', isAssistantReply, { body });
    return { ...reply, cards: reply.cards.map(filled), ...knownSteps(steps) };
  },
  // A main server before P02-13 refuses a key it does not know, so the reason is sent only when there is one.
  recalculateAnswer: (input, location, missing) =>
    call('POST', '/assistant/answers', isAnswerReply, {
      body: {
        input,
        location,
        ...((missing ?? null) === null ? {} : { locationMissing: missing }),
        clientCapabilities: ANSWER_CAPABILITIES,
      },
    }),
  answerTap: (tapped, location) => call('POST', '/assistant/taps', isLookup, { body: { tapped, location } }),
};

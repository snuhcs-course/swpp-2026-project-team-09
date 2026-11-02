/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AssistantReply,
  type ChatCard,
  type Choice,
  CLIENT_CAPABILITIES,
  MAP_LAYERS,
  type MapLayer,
  type QuestProposal,
  type ResolvedBy,
  type RestaurantCard,
  type RestaurantTravel,
  type TravelBox,
} from '@/api/assistant-types';
import type { ApiClient } from '@/api/client';
import { isResolvedBy } from './alias-client';
import { field, hasTexts, isBoard, isJoinPolicy, isNothing, isNumber, isText, isTextOrNull, listOf } from './answers';
import { isGlobalEvent } from './event-client';
import { isLibraryCardData, withLibraryDefaults } from './library-card-answers';
import { call } from './http';
import { isMenuLine } from './menu-answers';
import { isRecruitingQuest } from './party-client';

// The operation of the AI chat: the conversation goes to the main server, which asks the model. Every request says
// that this app draws library cards (`clientCapabilities`).

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

function isQuestProposal(value: unknown): value is QuestProposal {
  const place = field(value, 'place');
  const globalEvent = field(value, 'globalEvent');
  return (
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

function isRestaurant(value: unknown): value is RestaurantCard['restaurant'] {
  const meal = field(value, 'meal');
  return (
    hasTexts(value, ['key', 'name', 'date']) &&
    isTextOrNull(field(value, 'placeNumber')) &&
    (meal === 'lunch' || meal === 'dinner') &&
    isNumber(field(value, 'eatingMinutes')) &&
    listOf(isMenuLine)(field(value, 'lines')) &&
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

const CHOICE_KINDS = new Set<unknown>(['place', 'friend', 'globalEvent'] satisfies Choice['kind'][]);

function isChoice(value: unknown): value is Choice {
  return CHOICE_KINDS.has(field(value, 'kind')) && hasTexts(value, ['id', 'label', 'words']);
}

// A reply of a main server from before the candidates has no `choices`, and one from before aliases no `resolvedBy`.
export type AssistantAnswer = Omit<AssistantReply, 'choices' | 'resolvedBy'> & {
  choices?: Choice[];
  resolvedBy?: ResolvedBy[];
};

function filled(card: ChatCard): ChatCard {
  return card.kind === 'library' ? { kind: 'library', library: withLibraryDefaults(card.library) } : card;
}

export function isAssistantAnswer(value: unknown): value is AssistantAnswer {
  const proposal = field(value, 'proposal');
  const choices = field(value, 'choices');
  const resolvedBy = field(value, 'resolvedBy');
  return (
    hasTexts(value, ['text']) &&
    listOf(isMapLayer)(field(value, 'mapButtons')) &&
    listOf(isChatCard)(field(value, 'cards')) &&
    (isNothing(proposal) || isQuestProposal(proposal)) &&
    (choices === undefined || listOf(isChoice)(choices)) &&
    (resolvedBy === undefined || listOf(isResolvedBy)(resolvedBy))
  );
}

export const assistantClient: Pick<ApiClient, 'askAssistant'> = {
  askAssistant: async (messages) => {
    const answer = await call('POST', '/assistant/messages', isAssistantAnswer, {
      body: { messages, clientCapabilities: CLIENT_CAPABILITIES },
    });
    const { choices = [], resolvedBy = [], ...reply } = answer;
    return { ...reply, cards: reply.cards.map(filled), choices, resolvedBy };
  },
};

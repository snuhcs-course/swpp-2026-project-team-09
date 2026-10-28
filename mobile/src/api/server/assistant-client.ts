/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AssistantReply,
  type ChatCard,
  type Choice,
  MAP_LAYERS,
  type MapLayer,
  type QuestProposal,
} from '@/api/assistant-types';
import type { ApiClient } from '@/api/client';
import { field, hasTexts, isBoard, isJoinPolicy, isNothing, isNumber, listOf } from './answers';
import { isGlobalEvent } from './event-client';
import { call } from './http';
import { isRecruitingQuest } from './party-client';

// The operation of the AI chat: the conversation goes to the main server, which asks the model.

function isMapLayer(value: unknown): value is MapLayer {
  return MAP_LAYERS.some((layer) => layer === value);
}

function isChatCard(value: unknown): value is ChatCard {
  switch (field(value, 'kind')) {
    case 'globalEvent':
      return isGlobalEvent(field(value, 'globalEvent'));
    case 'quest':
      return isRecruitingQuest(field(value, 'quest'));
    default:
      return false;
  }
}

// A Place or a Friend of a Proposal: an id and a name.
function isNamed(value: unknown): value is { id: string; name: string } {
  return hasTexts(value, ['id', 'name']);
}

export function isQuestProposal(value: unknown): value is QuestProposal {
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

const CHOICE_KINDS = new Set<unknown>(['place', 'friend', 'globalEvent'] satisfies Choice['kind'][]);

function isChoice(value: unknown): value is Choice {
  return CHOICE_KINDS.has(field(value, 'kind')) && hasTexts(value, ['id', 'label', 'words']);
}

// A reply of a main server from before the candidates has no `choices`.
export type AssistantAnswer = Omit<AssistantReply, 'choices'> & { choices?: Choice[] };

export function isAssistantAnswer(value: unknown): value is AssistantAnswer {
  const proposal = field(value, 'proposal');
  const choices = field(value, 'choices');
  return (
    hasTexts(value, ['text']) &&
    listOf(isMapLayer)(field(value, 'mapButtons')) &&
    listOf(isChatCard)(field(value, 'cards')) &&
    (isNothing(proposal) || isQuestProposal(proposal)) &&
    (choices === undefined || listOf(isChoice)(choices))
  );
}

export const assistantClient: Pick<ApiClient, 'askAssistant'> = {
  askAssistant: async (messages) => {
    const { choices = [], ...reply } = await call('POST', '/assistant/messages', isAssistantAnswer, {
      body: { messages },
    });
    return { ...reply, choices };
  },
};

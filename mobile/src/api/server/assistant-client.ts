/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import {
  type AssistantReply,
  type ChatCard,
  MAP_LAYERS,
  type MapLayer,
  type QuestProposal,
} from '@/api/assistant-types';
import type { ApiClient } from '@/api/client';
import { field, hasTexts, isBoard, isNothing, isNumber, listOf } from './answers';
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

function isQuestProposal(value: unknown): value is QuestProposal {
  const joinPolicy = field(value, 'joinPolicy');
  const board = field(value, 'board');
  return (
    hasTexts(value, ['title', 'description', 'startsAt']) &&
    (joinPolicy === 'open' || joinPolicy === 'approval') &&
    board !== null &&
    isBoard(board) &&
    isNumber(field(value, 'capacity'))
  );
}

function isAssistantReply(value: unknown): value is AssistantReply {
  const proposal = field(value, 'proposal');
  return (
    hasTexts(value, ['text']) &&
    listOf(isMapLayer)(field(value, 'mapButtons')) &&
    listOf(isChatCard)(field(value, 'cards')) &&
    (isNothing(proposal) || isQuestProposal(proposal))
  );
}

export const assistantClient: Pick<ApiClient, 'askAssistant'> = {
  askAssistant: (messages) => call('POST', '/assistant/messages', isAssistantReply, { body: { messages } }),
};

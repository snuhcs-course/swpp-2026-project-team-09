/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type AssistantReply, MAP_LAYERS, type MapLayer } from '@/api/assistant-types';
import type { ApiClient } from '@/api/client';
import { field, hasTexts, listOf } from './answers';
import { call } from './http';

// The operation of the AI chat: the conversation goes to the main server, which asks the model.

function isMapLayer(value: unknown): value is MapLayer {
  return MAP_LAYERS.some((layer) => layer === value);
}

function isAssistantReply(value: unknown): value is AssistantReply {
  return hasTexts(value, ['text']) && listOf(isMapLayer)(field(value, 'mapButtons'));
}

export const assistantClient: Pick<ApiClient, 'askAssistant'> = {
  askAssistant: (messages) => call('POST', '/assistant/messages', isAssistantReply, { body: { messages } }),
};

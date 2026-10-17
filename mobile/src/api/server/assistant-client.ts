/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import type { ApiClient } from '@/api/client';
import { hasTexts } from './answers';
import { call } from './http';

// The operation of the AI chat: the conversation goes to the main server, which asks the model.

function isAssistantReply(value: unknown): value is AssistantReply {
  return hasTexts(value, ['text']);
}

export const assistantClient: Pick<ApiClient, 'askAssistant'> = {
  askAssistant: (messages) => call('POST', '/assistant/messages', isAssistantReply, { body: { messages } }),
};

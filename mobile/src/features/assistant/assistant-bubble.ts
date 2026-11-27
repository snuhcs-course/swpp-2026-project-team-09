/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ChatMessage, RequestContext } from '@/api/assistant-types';
import { ApiError } from '@/api/errors';
import { askAssistant } from './tracked-requests';
import type { ChatBubble, ChatFailure } from './use-chat';

// The Assistant's bubble of a request, as the chat adds it: the reply's words and what it drew, or a failure's words.

// Two lines: what failed, then why and where the words are (the input holds them again).
export const CHAT_FAILED =
  '답을 가져오지 못했어요.\n연결이 끊겼거나 서버가 답하지 않았어요. 쓴 말은 입력칸에 그대로 두었어요.';
export const CHAT_USED_UP = '오늘은 여기까지 답할 수 있어요. 내일 다시 물어봐 주세요';

const FAILURE_TEXT: Record<ChatFailure, string> = { unavailable: CHAT_FAILED, usedUp: CHAT_USED_UP };

export type NewBubble = Omit<ChatBubble, 'id'>;

// The Assistant's bubble for the conversation: its reply, or the failure.
export async function answerTo(messages: ChatMessage[], context: RequestContext): Promise<NewBubble> {
  try {
    const reply = await askAssistant(messages, context);
    const { text, cards, mapButtons, proposal, answer = null, lookup = null, refusal = null, offers, steps } = reply;
    const chosen = reply.select === undefined ? {} : { select: reply.select.planId };
    const cleared = reply.clears === true && answer === null && lookup === null ? { clears: true as const } : {};
    const drawn = { answer, lookup, refusal, area: context.viewport, ...chosen, ...cleared };
    const offered = offers === undefined || offers.length === 0 ? {} : { offers };
    const stepped = steps === undefined || steps.length < 2 ? {} : { steps };
    return { role: 'assistant', text, cards, mapButtons, proposal, failure: null, ...drawn, ...offered, ...stepped };
  } catch (error) {
    const failure = error instanceof ApiError && error.status === 429 ? 'usedUp' : 'unavailable';
    return { role: 'assistant', text: FAILURE_TEXT[failure], cards: [], mapButtons: [], proposal: null, failure };
  }
}

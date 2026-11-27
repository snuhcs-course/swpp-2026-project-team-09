/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ChatMessage, RequestContext } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import type { MakePlanQuest, PlanQuest } from '@/api/plan-quest-types';
import type { ShownAssistantReply } from '@/api/quest-parts-types';
import { trackAction } from '@/telemetry';
import { studyAloneInput } from './plan-input';

// The chat's two requests that are actions of the usage data (README.md, "Usage data"): asking the Assistant, and a
// Plan sent that makes a 파티.

export function askAssistant(messages: ChatMessage[], context: RequestContext): Promise<ShownAssistantReply> {
  return trackAction({ action: 'assistant_reply' }, () => apiClient.askAssistant(messages, context));
}

// A Plan "여기로" takes alone: an events Plan, or a meal's, a meet's or a study's for the asker only (a study's since
// P10 ticket 19).
export function takenAlone(input: AnswerReply['input']): boolean {
  return (
    input.kind === 'events' ||
    ((input.kind === 'meal' || input.kind === 'meet') && input.people.length < 2) ||
    studyAloneInput(input)
  );
}

// Sends the Plan. One taken alone makes no 파티 and sends no usage data; a new recruiting Quest is posted Open, a meal
// or a meeting with Friends is Closed.
export function sendPlan(input: AnswerReply['input'], making: MakePlanQuest, key: string): Promise<PlanQuest> {
  const send = (): Promise<PlanQuest> => apiClient.makePlanQuest(making, key);
  if (takenAlone(input)) {
    return send();
  }
  return trackAction({ action: 'party_creation', visibility: input.kind === 'new-quest' ? 'public' : 'private' }, send);
}

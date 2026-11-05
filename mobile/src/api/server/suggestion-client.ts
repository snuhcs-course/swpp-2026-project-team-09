/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { ChatSuggestion, SuggestionAction } from '@/api/suggestion-types';
import { field, hasTexts, isNothing } from './answers';
import { isQuestProposal } from './assistant-client';
import { call } from './http';

// The grey suggestion of the empty chat: the main server picks it without the model, and hears what became of it.

function isSuggestionAction(value: unknown): value is SuggestionAction {
  switch (field(value, 'type')) {
    case 'proposal':
      return isQuestProposal(field(value, 'proposal'));
    case 'route':
      return hasTexts(value, ['placeId', 'name']);
    default:
      return false;
  }
}

export function isChatSuggestion(value: unknown): value is ChatSuggestion {
  return hasTexts(value, ['id', 'text', 'reason']) && isSuggestionAction(field(value, 'action'));
}

// A suggestion of an action the app does not know is refused whole, as no suggestion.
export function isSuggestionAnswer(value: unknown): value is { suggestion: ChatSuggestion | null } {
  const suggestion = field(value, 'suggestion');
  return isNothing(suggestion) || isChatSuggestion(suggestion);
}

export const suggestionClient: Pick<ApiClient, 'getChatSuggestion' | 'sendSuggestionOutcome'> = {
  getChatSuggestion: async ({ screen, openEventId }) => {
    const query: Record<string, string> =
      openEventId === null ? { screen } : { screen, openCard: `globalEvent:${openEventId}` };
    return (await call('GET', '/assistant/suggestion', isSuggestionAnswer, { query })).suggestion;
  },
  sendSuggestionOutcome: async (suggestionId, outcome) => {
    await call('POST', `/assistant/suggestions/${suggestionId}/outcome`, isNothing, { body: outcome });
  },
};

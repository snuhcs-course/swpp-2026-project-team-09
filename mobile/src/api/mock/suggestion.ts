/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { ChatSuggestion, SuggestionOutcome } from '@/api/suggestion-types';
import { now } from '@/clock';
import { koreaClock, koreaDateKey } from '@/korea-time';
import { answer } from './answer';
import { FRIENDS } from './data/friends';

// The grey suggestion without a main server: lunch with 김민준, a Friend who is free at the wireframes' moment, as
// the main server's lunch_with_free_friend would propose it, so that the row can be seen and tried. The outcomes are
// kept in memory, for the tests.

export const MOCK_SUGGESTION_ID = 'mock-suggestion-lunch';

const QUARTER_MS = 15 * 60_000;

// The next quarter hour at least 15 minutes ahead, in Korea time with its offset.
function lunchStart(): string {
  const at = new Date(Math.ceil((now().getTime() + QUARTER_MS) / QUARTER_MS) * QUARTER_MS);
  return `${koreaDateKey(at)}T${koreaClock(at.toISOString())}:00+09:00`;
}

function lunchSuggestion(): ChatSuggestion {
  const friend = FRIENDS.find(({ name }) => name === '김민준');
  return {
    id: MOCK_SUGGESTION_ID,
    text: '민준이랑 점심 어때요?',
    reason: '공강 시작 · 민준이도 공강',
    action: {
      type: 'proposal',
      proposal: {
        title: '민준이랑 점심',
        description: '',
        joinPolicy: 'closed',
        board: null,
        capacity: 2,
        startsAt: lunchStart(),
        place: null,
        globalEvent: null,
        invitees: friend === undefined ? [] : [{ id: friend.id, name: friend.name }],
      },
    },
  };
}

const outcomes: ({ suggestionId: string } & SuggestionOutcome)[] = [];

export function mockSuggestionOutcomes(): readonly ({ suggestionId: string } & SuggestionOutcome)[] {
  return outcomes;
}

export function forgetMockSuggestionOutcomes(): void {
  outcomes.length = 0;
}

export const mockSuggestion: Pick<ApiClient, 'getChatSuggestion' | 'sendSuggestionOutcome'> = {
  getChatSuggestion: () => answer('getChatSuggestion', lunchSuggestion, null),
  sendSuggestionOutcome: async (suggestionId, outcome) => {
    await answer('sendSuggestionOutcome', () => {
      outcomes.push({ suggestionId, ...outcome });
    });
  },
};

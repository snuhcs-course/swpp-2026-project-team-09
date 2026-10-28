/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import type { FakeServer } from '../support/fake-server';
import { startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import { apiClient } from '@/api/client';
import type { ChatSuggestion } from '@/api/suggestion-types';

// The grey suggestion through the client of the build that asks the main server: the request, its answer and the
// outcomes, against the fake main server.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const SUGGESTION: ChatSuggestion = {
  id: 's1',
  text: '다음 수업 가는 길',
  reason: '14:00 자료구조 · 제1공학관',
  action: { type: 'route', placeId: 'p301', name: '제1공학관' },
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  server = await askMainServer({ signedIn: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('GET /assistant/suggestion', () => {
  it('names the screen, and the open event card as globalEvent:<id>', async () => {
    server.on('GET /assistant/suggestion', { status: 200, body: { suggestion: SUGGESTION } });

    await expect(apiClient.getChatSuggestion({ screen: 'main', openEventId: null })).resolves.toEqual(SUGGESTION);
    await apiClient.getChatSuggestion({ screen: 'main', openEventId: 'e1' });

    expect(server.received('GET /assistant/suggestion').map(({ query }) => query)).toEqual([
      { screen: 'main' },
      { screen: 'main', openCard: 'globalEvent:e1' },
    ]);
  });

  it('gives null when none fits', async () => {
    server.on('GET /assistant/suggestion', { status: 200, body: { suggestion: null } });

    await expect(apiClient.getChatSuggestion({ screen: 'main', openEventId: null })).resolves.toBeNull();
  });

  it('fails where an older main server has no such route', async () => {
    await expect(apiClient.getChatSuggestion({ screen: 'main', openEventId: null })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('POST /assistant/suggestions/:id/outcome', () => {
  it('sends each outcome, the Quest with a confirmation', async () => {
    server.on('POST /assistant/suggestions/s1/outcome', { status: 204 });

    await apiClient.sendSuggestionOutcome('s1', { outcome: 'accepted' });
    await apiClient.sendSuggestionOutcome('s1', { outcome: 'dismissed' });
    await apiClient.sendSuggestionOutcome('s1', { outcome: 'confirmed', questId: 'q1' });

    expect(server.received('POST /assistant/suggestions/s1/outcome').map(({ body }) => body)).toEqual([
      { outcome: 'accepted' },
      { outcome: 'dismissed' },
      { outcome: 'confirmed', questId: 'q1' },
    ]);
  });
});

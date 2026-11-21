/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import type { ChatMessage, RequestContext } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { googleAvailable } from '@/auth/google';

// A Restaurant card's hours (P05 ticket 12) are optional in the reply: a main server before them sends none, and one
// after them sends the meal's hours or null.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const MESSAGES: ChatMessage[] = [{ role: 'user', text: '점심 어디서 먹지?' }];

const CONTEXT: RequestContext = { location: null, viewport: null, tapped: null, conditions: null, planId: null };

const CARD = {
  kind: 'restaurant',
  restaurant: {
    key: '학생회관식당',
    name: '학생회관식당',
    placeNumber: '63',
    date: '2026-11-23',
    meal: 'lunch',
    eatingMinutes: 40,
    lines: [{ text: '돈까스 : 5,500원', kind: 'dish', name: '돈까스', price: 5500 }],
    people: [{ name: '나', mode: 'walk', minutes: 4, longest: true }],
    proposal: {
      title: '학생회관식당에서 점심',
      description: '',
      joinPolicy: 'closed',
      board: null,
      capacity: 1,
      startsAt: '2026-11-23T12:10:00+09:00',
      place: { id: 'place-63', name: '학생회관식당 (63동)', booking: null },
      globalEvent: null,
      invitees: [],
    },
  },
};

const replyWith = (restaurant: object): object => ({
  text: '학생회관식당이 가까워요.',
  mapButtons: [],
  cards: [{ ...CARD, restaurant }],
  proposal: null,
});

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("A Restaurant card's hours", () => {
  it.each([
    ['with the meal hours', { ...CARD.restaurant, hours: { opensAt: '11:00', closesAt: '14:30' } }],
    ['with none kept, null', { ...CARD.restaurant, hours: null }],
    ['from a main server before them, absent', CARD.restaurant],
  ])('is believed %s', async (_, restaurant) => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: replyWith(restaurant) });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).resolves.toMatchObject({ cards: [{ restaurant }] });
  });

  it('is refused with hours of another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: replyWith({ ...CARD.restaurant, hours: '11:00' }) });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).rejects.toThrow();
  });
});

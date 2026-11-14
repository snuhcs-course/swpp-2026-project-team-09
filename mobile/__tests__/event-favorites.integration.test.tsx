/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerEvents, BOOK_TALK, card, CAREER, MAJOR, openEvents } from './support/events';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { EVENT, lookOf, press } from './support/markers';
import { startFresh } from './support/mocks';
import { askMainServer, PHONE_NOW } from './support/server';

// Favorite Events against the fake main server, on Tuesday 6 October 2026 at 13:00 in Korea: the ☆ on the 행사 tab's
// cards and on the map's card of one event, and the map keeping only today's and the Favorite Events.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const FAVORITE = '즐겨찾기';
const NOT_CHANGED = '즐겨찾기를 바꾸지 못했어요';
const MAJOR_PIN = `공식 행사 · ${MAJOR.title}`;
const BOOK_TALK_PIN = `공식 행사 · ${BOOK_TALK.title}`;
const TWO_AT_ONE_POINT = '공식 행사 2개 · 301동 대강당';

// The main server takes the change after `afterMs`, or refuses it.
function answerFavorite(eventId: string, reply: { status: number; afterMs?: number; body?: unknown }): void {
  server.on(`PUT /global-events/${eventId}/favorite`, reply);
  server.on(`DELETE /global-events/${eventId}/favorite`, reply);
}

function star(of: ReturnType<typeof card>): ReturnType<ReturnType<typeof card>['getByRole']> {
  return of.getByRole('button', { name: FAVORITE });
}

describe('the ☆ on the 행사 tab', () => {
  it('stars the event at once, before the main server answers, and stays starred after', async () => {
    answerEvents(server);
    answerFavorite(MAJOR.id, { status: 204, afterMs: 1000 });
    const user = await openEvents();
    expect(star(card(MAJOR))).not.toBeSelected();

    await user.press(star(card(MAJOR)));

    expect(star(card(MAJOR))).toBeSelected();
    expect(server.received(`PUT /global-events/${MAJOR.id}/favorite`)).toHaveLength(1);
    await pass(1500);
    expect(star(card(MAJOR))).toBeSelected();
    expect(star(card(CAREER))).not.toBeSelected();
  });

  it('clears the star of a Favorite Event', async () => {
    answerEvents(server, { events: [CAREER, { ...MAJOR, favorite: true }, BOOK_TALK] });
    answerFavorite(MAJOR.id, { status: 204 });
    const user = await openEvents();
    expect(star(card(MAJOR))).toBeSelected();

    await user.press(star(card(MAJOR)));
    await pass(500);

    expect(star(card(MAJOR))).not.toBeSelected();
    expect(server.received(`DELETE /global-events/${MAJOR.id}/favorite`)).toHaveLength(1);
  });

  it('turns back with a toast when the main server does not take the change', async () => {
    answerEvents(server);
    answerFavorite(MAJOR.id, { status: 500, body: { statusCode: 500 }, afterMs: 1000 });
    const user = await openEvents();

    await user.press(star(card(MAJOR)));
    expect(star(card(MAJOR))).toBeSelected();
    await pass(1500);

    expect(star(card(MAJOR))).not.toBeSelected();
    expect(screen.getByTestId('toast-layer')).toHaveTextContent(NOT_CHANGED);
  });
});

describe('the events on the map', () => {
  it("keeps today's event and a Favorite Event, the star's pin at every level, and none of the others", async () => {
    answerEvents(server, { events: [CAREER, { ...MAJOR, favorite: true }, BOOK_TALK] });
    await openMain();

    expect(lookOf(EVENT)).toBe('official:dot');
    expect(lookOf(MAJOR_PIN)).toBe('official:pin:starred');
    expect(screen.queryByRole('button', { name: BOOK_TALK_PIN })).toBeNull();
  });

  it("has the ☆ on one event's card, and starring there puts the event's star pin on the map", async () => {
    answerEvents(server);
    answerFavorite(CAREER.id, { status: 204 });
    const user = await openMain();
    await press(user, EVENT);

    await user.press(screen.getByRole('button', { name: FAVORITE }));
    await pass(500);

    expect(screen.getByRole('button', { name: FAVORITE })).toBeSelected();
    // With the count of the 파티 that gather for it, as before.
    expect(lookOf(EVENT)).toBe('official:pin:2:starred:selected');
  });

  it("marks a Favorite Event's row with ★ on a grouped pin's card, which has no ☆ of its own", async () => {
    // Today at 15:00, where the career talk is.
    const talk = {
      ...CAREER,
      id: 'e4',
      title: '컴퓨터공학부 취업 특강',
      startsAt: '2026-10-06T06:00:00.000Z',
      favorite: true,
    };
    answerEvents(server, { events: [CAREER, talk] });
    const user = await openMain();
    expect(lookOf(TWO_AT_ONE_POINT)).toBe('official:pin:2:starred');

    await press(user, TWO_AT_ONE_POINT);

    expect(screen.getByRole('button', { name: `${FAVORITE} · ${talk.title}` })).toBeVisible();
    expect(screen.getByRole('button', { name: CAREER.title })).toBeVisible();
    expect(screen.queryByRole('button', { name: FAVORITE })).toBeNull();
  });
});

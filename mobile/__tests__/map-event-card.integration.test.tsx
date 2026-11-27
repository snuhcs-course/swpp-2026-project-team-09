/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { answerEvents, CAREER, SEO_YEON_GOING, TAE_O_GOING } from './support/events';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { EVENT, lookOf, press, zoomIn } from './support/markers';
import { startFresh } from './support/mocks';
import { askMainServer, PHONE_NOW } from './support/server';

// 같이 갈 사람 찾기 on the map's event card, against the fake main server: the sheet of the Quests gathering for the
// Global Event, as the 행사 tab opens it (`events-recruiting.integration.test.tsx`), or 파티 만들기 when none does.

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

describe("the map's event card", () => {
  it('counts the Quests gathering for the event, and opens their sheet over the map, as the 행사 tab does', async () => {
    // A Favorite Event, which the everyday map keeps.
    answerEvents(server, { events: [{ ...CAREER, favorite: true }] });
    const user = await openMain();
    await zoomIn(user, 2);
    expect(lookOf(EVENT)).toBe('official:pin:2:starred');

    await press(user, EVENT);
    expect(screen.getByText('같이 갈 파티 2개 모집 중')).toBeVisible();
    await press(user, '같이 갈 사람 찾기');
    await pass(500);

    expect(screen.getByRole('header', { name: '모집 중인 파티 2' })).toBeVisible();
    expect(screen.getByRole('button', { name: /^이서연 2\/4명/u })).toBeVisible();
  });

  it('opens the recruiting post of a row of that sheet', async () => {
    answerEvents(server, { events: [{ ...CAREER, favorite: true }] });
    server.on('GET /quest-join-requests', { status: 200, body: [] });
    const user = await openMain();
    await zoomIn(user, 2);
    await press(user, EVENT);
    await press(user, '같이 갈 사람 찾기');
    await pass(500);

    await user.press(screen.getByRole('button', { name: /^이서연/u }));
    await pass(500);

    expect(shownAddress()).toBe(`/post/${SEO_YEON_GOING.id}`);
  });

  it('opens 파티 만들기 with the event when nothing gathers for it', async () => {
    answerEvents(server, { events: [{ ...CAREER, favorite: true }], recruiting: [] });
    const user = await openMain();
    await zoomIn(user, 2);

    await press(user, EVENT);
    await press(user, '같이 갈 사람 찾기');
    await pass(500);

    expect(shownAddress()).toBe(`/party-form?eventId=${CAREER.id}`);
  });

  it('counts no full Quest, and opens 파티 만들기 when only full ones gather', async () => {
    const full = [
      { ...SEO_YEON_GOING, holderCount: 4 },
      { ...TAE_O_GOING, holderCount: 4 },
    ];
    answerEvents(server, { events: [{ ...CAREER, favorite: true }], recruiting: full });
    const user = await openMain();
    await zoomIn(user, 2);

    await press(user, EVENT);
    expect(screen.queryByText(/^같이 갈 파티 \d개 모집 중$/u)).toBeNull();
    await press(user, '같이 갈 사람 찾기');
    await pass(500);

    expect(shownAddress()).toBe(`/party-form?eventId=${CAREER.id}`);
  });
});

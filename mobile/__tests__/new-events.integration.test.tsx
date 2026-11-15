/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { ListedGlobalEvent } from '@/api/types';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerEvents, BOOK_TALK, CAREER, MAJOR } from './support/events';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { EVENT, lookOf, press } from './support/markers';
import { startFresh } from './support/mocks';
import { askMainServer, PHONE_NOW } from './support/server';

// New Events against the fake main server, on Tuesday 6 October 2026 at 13:00 in Korea: an event published an hour ago
// has the exclamation mark until the User closes its card on the map, and a starred one stays as a star pin.

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

// Today at 12:00 in Korea, an hour before the phone's time.
const AN_HOUR_AGO = '2026-10-06T03:00:00.000Z';
// Thursday's event, published an hour ago: only being new puts it on the map today.
const NEW_MAJOR: ListedGlobalEvent = { ...MAJOR, publishedAt: AN_HOUR_AGO };
const MAJOR_PIN = `공식 행사 · ${MAJOR.title}`;
const FAVORITE = '즐겨찾기';

function mapCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

async function closeCard(user: Awaited<ReturnType<typeof openMain>>): Promise<void> {
  await user.press(mapCard().getByRole('button', { name: '닫기' }));
  await pass(500);
}

describe('a New Event on the map', () => {
  it('has the exclamation mark while its card is open, and leaves the map once the card closes', async () => {
    answerEvents(server, { events: [CAREER, NEW_MAJOR, BOOK_TALK] });
    const user = await openMain();
    expect(lookOf(MAJOR_PIN)).toBe('official:pin:fresh');

    await press(user, MAJOR_PIN);
    await pass(500);
    expect(lookOf(MAJOR_PIN)).toBe('official:pin:fresh:selected');

    await closeCard(user);

    expect(screen.queryByRole('button', { name: MAJOR_PIN })).toBeNull();
    expect(lookOf(EVENT)).toBe('official:dot');
  });

  it('stays as a star pin when it was starred on its card', async () => {
    answerEvents(server, { events: [CAREER, NEW_MAJOR, BOOK_TALK] });
    server.on(`PUT /global-events/${MAJOR.id}/favorite`, { status: 204 });
    const user = await openMain();
    await press(user, MAJOR_PIN);

    await user.press(mapCard().getByRole('button', { name: FAVORITE }));
    await pass(500);
    await closeCard(user);

    expect(lookOf(MAJOR_PIN)).toBe('official:pin:starred');
  });

  it('stays while its card is open though its star was taken back, and leaves when the card closes', async () => {
    answerEvents(server, { events: [CAREER, NEW_MAJOR, BOOK_TALK] });
    server.on(`PUT /global-events/${MAJOR.id}/favorite`, { status: 204 });
    server.on(`DELETE /global-events/${MAJOR.id}/favorite`, { status: 204 });
    const user = await openMain();
    await press(user, MAJOR_PIN);

    await user.press(mapCard().getByRole('button', { name: FAVORITE }));
    await pass(500);
    await user.press(mapCard().getByRole('button', { name: FAVORITE }));
    await pass(500);

    expect(mapCard().getByText(MAJOR.title)).toBeVisible();
    await closeCard(user);
    expect(screen.queryByRole('button', { name: MAJOR_PIN })).toBeNull();
  });
});

// Published an hour ago, today at 15:00, where the career talk is.
const TALK: ListedGlobalEvent = {
  ...CAREER,
  id: 'e4',
  title: '컴퓨터공학부 취업 특강',
  startsAt: '2026-10-06T06:00:00.000Z',
  endsAt: null,
  publishedAt: AN_HOUR_AGO,
};
const TWO_AT_ONE_POINT = '공식 행사 2개 · 301동 대강당';

describe('a grouped pin with a New Event', () => {
  it('checks nothing when its card opens and closes', async () => {
    answerEvents(server, { events: [CAREER, TALK] });
    const user = await openMain();
    expect(lookOf(TWO_AT_ONE_POINT)).toBe('official:pin:2:fresh');

    await press(user, TWO_AT_ONE_POINT);
    await pass(500);
    await closeCard(user);

    expect(lookOf(TWO_AT_ONE_POINT)).toBe('official:pin:2:fresh');
  });
});

describe("a grouped pin's New Event opened from its row", () => {
  it('loses the exclamation mark once the New Event its row opened is closed, the other staying as its own pin', async () => {
    // Next week, so that the talk leaves the map once it is checked.
    const later = { ...TALK, startsAt: '2026-10-14T06:00:00.000Z' };
    answerEvents(server, { events: [CAREER, later] });
    const user = await openMain();
    await press(user, TWO_AT_ONE_POINT);
    await pass(500);

    await user.press(mapCard().getByRole('button', { name: later.title }));
    await pass(500);
    await closeCard(user);

    expect(screen.queryByRole('button', { name: TWO_AT_ONE_POINT })).toBeNull();
    expect(lookOf(EVENT)).toBe('official:dot');
  });

  it("keeps the place's pin without the mark while both stay, the checked one held today", async () => {
    answerEvents(server, { events: [CAREER, TALK] });
    const user = await openMain();
    await press(user, TWO_AT_ONE_POINT);
    await pass(500);

    await user.press(mapCard().getByRole('button', { name: TALK.title }));
    await pass(500);
    await closeCard(user);

    expect(lookOf(TWO_AT_ONE_POINT)).toBe('official:dot');
  });
});

describe('the checked New Events', () => {
  it('are kept on the phone: the mark does not come back when the app opens again', async () => {
    answerEvents(server, { events: [CAREER, NEW_MAJOR, BOOK_TALK] });
    const user = await openMain();
    await press(user, MAJOR_PIN);
    await closeCard(user);

    await openMain();

    expect(screen.queryByRole('button', { name: MAJOR_PIN })).toBeNull();
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerEvents, BOOK_TALK, card, CAREER, MAJOR, openEvents, shownEvents } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { askMainServer, PHONE_NOW } from './support/server';
import { FAVORITE_LABEL } from '@/screens/events/favorite-toggle';

// The 행사 tab's ☆ in its header (P06 ticket 57, the user's choice 나 on 2026-11-28): on, the list holds the starred
// events alone, within the chip chosen and the search; on Tuesday 6 October 2026 at 13:00 in Korea, CAREER is today,
// MAJOR this week and BOOK_TALK next week.

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

const STARRED_ONLY = '별표한 행사만 보기';

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

function starredOnly(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name: STARRED_ONLY });
}

describe("the ☆ in the 행사 tab's header", () => {
  it('is off at first; on, it shows the starred events alone, within the chip chosen', async () => {
    answerEvents(server, { events: [CAREER, { ...MAJOR, favorite: true }, { ...BOOK_TALK, favorite: true }] });
    const user = await openEvents();
    expect(starredOnly()).not.toBeSelected();
    expect(shownEvents()).toEqual([CAREER.title, MAJOR.title, BOOK_TALK.title]);

    await user.press(starredOnly());
    expect(starredOnly()).toBeSelected();
    expect(shownEvents()).toEqual([MAJOR.title, BOOK_TALK.title]);

    await user.press(screen.getByRole('button', { name: '이번 주' }));
    expect(shownEvents()).toEqual([MAJOR.title]);
    await user.press(screen.getByRole('button', { name: '오늘' }));
    expect(screen.getByText('오늘 별표한 행사가 없어요')).toBeVisible();

    await user.press(starredOnly());
    expect(shownEvents()).toEqual([CAREER.title]);
  });

  it('says how to fill the list when nothing is starred', async () => {
    answerEvents(server);
    const user = await openEvents();

    await user.press(starredOnly());

    expect(screen.getByText('별표한 행사가 없어요')).toBeVisible();
    expect(screen.getByText('행사 옆 ☆를 눌러 모아 보세요')).toBeVisible();
  });
});

describe("the ☆ in the 행사 tab's header, with a change made while it is on", () => {
  it('keeps the row of an event unstarred while it is on, so that a wrong press is undone where it was made', async () => {
    answerEvents(server, { events: [CAREER, { ...MAJOR, favorite: true }, BOOK_TALK] });
    server.on(`DELETE /global-events/${MAJOR.id}/favorite`, { status: 204 });
    const user = await openEvents();
    await user.press(starredOnly());

    await user.press(card(MAJOR).getByRole('button', { name: FAVORITE_LABEL }));
    await pass(500);

    expect(shownEvents()).toEqual([MAJOR.title]);
    expect(card(MAJOR).getByRole('button', { name: FAVORITE_LABEL })).not.toBeSelected();
  });

  it('searches within the starred events while it is on', async () => {
    answerEvents(server, { events: [CAREER, { ...MAJOR, favorite: true }, BOOK_TALK] });
    const user = await openEvents();
    await user.press(starredOnly());

    await user.press(screen.getByRole('button', { name: '행사 검색' }));
    await user.type(screen.getByLabelText('행사 검색어'), '커리어');
    expect(screen.getByText('결과 없음')).toBeVisible();

    await user.clear(screen.getByLabelText('행사 검색어'));
    await user.type(screen.getByLabelText('행사 검색어'), '연합전공');
    expect(shownEvents()).toEqual([MAJOR.title]);
  });
});

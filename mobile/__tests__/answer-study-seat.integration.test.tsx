/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, screen, within } from '@testing-library/react-native';
import { STUDY_PLAN_REPLY } from '@/api/mock/data/study-plan-answer';
import type { Place } from '@/api/types';
import { markLibraryLoggedIn } from '@/library/flag';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { mapThings } from './support/answer-map';
import { PLACES } from './support/dining';
import { layStage } from './support/lists';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { expectNoWrite, inDock, inFrame, sendFromBar, startLibraryChat } from './support/library-chat';
import { openMain } from './support/main';

// 관정관 opened from a study answer alone (P10 ticket 22): its view is today's seat ticket, the book card the main
// server sends with the Plan (its ticket 21), in the place of its spaces. It is the framed seat answer's (P10 ticket 27,
// the user's phone, 2026-11-27: "왜 관정 도서관을 클릭하면 채팅 카드에도 시간 축이 존재하지?"): one time card on top,
// which the ticket books, the ticket in the card with no band and no 예약 안 함 of its own, and 예약하기 beside the
// input. Nothing is written to the library before 예약하기.

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

// The stored study answer's day and time: Wednesday 2026-11-04 at 19:10.
const ASKED = new Date('2026-11-04T10:10:00.000Z');
const KEY = 'book:7F-7A-zone2:2026-11-04:1930:210';

// 관정관 among the Places, as the main server lists it, so that its booking stands on the map.
const KWANJEONG: Place = {
  id: 'p62-1',
  number: '62-1',
  name: '중앙도서관 관정관',
  latitude: 37.45903,
  longitude: 126.95247,
};

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat(ASKED));
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
});

function bar(): ReturnType<typeof within> {
  return within(screen.getByTestId('time-bar'));
}

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The everyday map's things before the question, and the User to press with after it.
async function opened(row: number): Promise<{ user: Awaited<ReturnType<typeof openMain>>; everyday: string[] }> {
  await markLibraryLoggedIn();
  server.on('POST /assistant/messages', { status: 200, body: STUDY_PLAN_REPLY });
  const user = await openMain();
  const everyday = mapThings();
  await sendFromBar(user, '공부할 자리 있어?');
  await user.press(inFrame().getByTestId(`meal-row-${String(row)}`));
  await layStage(390, 760);
  await pass(500);
  return { user, everyday };
}

// Partitions: 관정관; 관정관 with its end moved on the top card; another place. Expected values: the stored answer and its
// book card, 19:30 for 210 minutes.
describe('a study place opened from the list', () => {
  it('is today’s seat ticket for 관정관 under one time card, with 예약하기 beside the input, writing nothing', async () => {
    await opened(2);
    const seat = within(inFrame().getByTestId(`library-book-${KEY}`));

    expect(bar().getByText('19:30–23:00 · 3시간 30분')).toBeVisible();
    // The head says the way there alone: the top card is the one time.
    expect(inFrame().getByText('걸음 14분')).toBeVisible();
    expect(inFrame().queryByText(/23:00까지/u)).toBeNull();
    expect(seat.getByRole('button', { name: '열람실: 7층 열람실' })).toBeOnTheScreen();
    expect(inFrame().queryByTestId('slot-band')).toBeNull();
    expect(screen.queryByRole('button', { name: '예약 안 함' })).toBeNull();
    expect(seat.queryByRole('button', { name: '예약하기' })).toBeNull();
    expect(inDock().getByRole('button', { name: '예약하기' })).toBeEnabled();
    expect(inFrame().queryByTestId('study-spaces')).toBeNull();
    expectNoWrite(library);
  });

  it('books the time the top card shows', async () => {
    await opened(2);

    await fireEvent(bar().getByRole('adjustable', { name: '끝 시각' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    await pass(500);
    expect(bar().getByText('19:30–22:30 · 3시간')).toBeVisible();
    await fireEvent.press(inDock().getByRole('button', { name: '예약하기' }));
    await pass(500);

    expect(library.writes().map(({ body }) => body.bookTime)).toEqual(['1930-2230']);
  });

  it('is its spaces and hours for another place', async () => {
    await opened(1);

    expect(inFrame().getByTestId('study-spaces')).toBeVisible();
    expect(inFrame().queryByTestId(`library-book-${KEY}`)).toBeNull();
  });
});

// Partitions: 관정관 opened, then the answer hidden (✕; "←" and a drag down hide it as ✕ does). Expected values: the
// everyday map's things before the question.
describe('a study place opened from the list, then the answer hidden', () => {
  it('gives the map back to the everyday map once the answer is hidden', async () => {
    const { user, everyday } = await opened(2);
    expect(mapThings()).not.toEqual(everyday);

    await user.press(inFrame().getByRole('button', { name: '답 닫기' }));
    await pass(500);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(mapThings()).toEqual(everyday);
  });
});

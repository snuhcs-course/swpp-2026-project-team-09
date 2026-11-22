/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import type { Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapLines, mapThings } from './support/answer-map';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, expectNoWrite, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';

// P04 ticket 07: a 관정도서관 seat card stands on the map as a flag on 관정관 with the room, the seat, and the time, my
// walk there, its band on the top bar, and its 예약하기 beside the input. The phone's clock stands on Monday 2026-11-02
// at 16:00 in Korea; the card is for 7층 7A 열람실 2 구역 today from 17:00 for an hour.

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

const KWANJEONG: Place = {
  id: 'p62-1',
  number: '62-1',
  name: '중앙도서관 관정관',
  latitude: 37.45903,
  longitude: 126.95247,
};
const FLAG = /^관정 7층 열람실 › · (\d+번 )?17:00–18:00$/u;

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function asked(loggedIn = true): Promise<Awaited<ReturnType<typeof askForCards>>> {
  const chat = await askForCards({ server, library }, [SEAT_CARD], { loggedIn });
  await layStage(390, 760);
  await pass(500);
  return chat;
}

function flagName(): string {
  const name = mapThings().find((thing) => FLAG.test(thing));
  if (name === undefined) {
    throw new Error(`No booking flag among ${mapThings().join(', ')}`);
  }
  return name;
}

function bar(): ReturnType<typeof within> {
  return within(screen.getByTestId('time-bar'));
}

describe('a seat card on the map', () => {
  it('stands as a flag with the room, the seat, and the time, with a walk, the band on top, and 예약하기', async () => {
    await asked();

    expect(flagName()).toMatch(/^관정 7층 열람실 › · \d+번 17:00–18:00$/u);
    expect(mapLines()).toHaveLength(1);
    expect(bar().getByText('17:00–18:00 · 1시간')).toBeVisible();
    expect(screen.getByRole('button', { name: '예약하기' })).toBeEnabled();
    expect(within(screen.getByTestId('answer-card')).getByRole('button', { name: /7층 열람실/u })).toBeVisible();
    expectNoWrite(library);
  });

  it("changes the card's end by a step of the bar's end, as the band did", async () => {
    await asked();

    await fireEvent(bar().getByRole('adjustable', { name: '끝 시각' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    await pass(500);

    expect(bar().getByText('17:00–18:30 · 1시간 30분')).toBeVisible();
    expect(screen.getByText('오늘 17:00–18:30')).toBeVisible();
    expect(mapThings()).toContainEqual(expect.stringMatching(/17:00–18:30$/u));
    expectNoWrite(library);
  });

  it('says 로그인 beside the input while logged out of the library', async () => {
    await asked(false);

    expect(mapThings()).toContainEqual(expect.stringMatching(/^관정 7층 열람실 › · 17:00–18:00$/u));
    expect(screen.getAllByRole('button', { name: '로그인' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '예약하기' })).toBeNull();
  });

  it('opens 다른 자리 고르기 from its flag, which opens the seat picture', async () => {
    const { user } = await asked();

    await pressMarker(user, flagName());
    const rows = within(screen.getByTestId('mark-card'));
    await user.press(rows.getByRole('button', { name: '다른 자리 고르기' }));
    await pass(500);

    expect(screen.getByText('관정관 7층 7A 열람실 2 구역 좌석 현황')).toBeVisible();
    expectNoWrite(library);
  });
});

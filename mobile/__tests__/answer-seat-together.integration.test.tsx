/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { STUDY_GROUP_TO_SEND } from '@/api/mock/data/study-group-answers';
import { READING_ROOM } from '@/api/mock/data/library';
import type { Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';
import { checkedRows, pickDone, pickRow, pickRows } from './support/picking';
import { YU_NA } from './support/party';
import { SEO_YEON_HOLDER as SEO_YEON } from './support/room';
import { ME_ID, MIN_JUN } from './support/server';

// P10 ticket 15: the 관정 seat answer alone gets the time card's shared "＋ 같이", the meal's chip and picker. Friends
// picked ask the study answer together for the seat card's day and time; every Friend taken out again shows the seat
// card the phone kept, with no request. The phone's clock stands on Monday 2026-11-02 at 16:00 in Korea; the card is
// for 7층 7A 열람실 2 구역 today from 17:00 for an hour.

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
const ADD = '같이 공부할 친구 추가';
const ANSWERS = 'POST /assistant/answers';

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
  server.on(ANSWERS, { status: 200, body: STUDY_GROUP_TO_SEND });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof askForCards>>['user'];

async function seatAnswer(): Promise<User> {
  const { user } = await askForCards({ server, library }, [SEAT_CARD]);
  await layStage(390, 760);
  await pass(500);
  return user;
}

function bar(): ReturnType<typeof within> {
  return within(screen.getByTestId('time-bar'));
}

// A row's name, before its walk.
const nameOf = (row: string): string => row.split(' · ')[0] ?? row;

function inputOf(body: unknown): unknown {
  return typeof body === 'object' && body !== null && 'input' in body ? body.input : null;
}

// Partitions: the chip, picking Friends and 완료, then every Friend taken out. Expected values: ticket 15.
describe('"＋ 같이" on the seat answer alone, Friends picked', () => {
  it("stands in the time card and opens the meal's picker of Friends", async () => {
    const user = await seatAnswer();

    await user.press(bar().getByRole('button', { name: ADD }));

    expect(pickRows().map((row) => nameOf(row))).toEqual(expect.arrayContaining([MIN_JUN.name, YU_NA.name]));
  });

  it('asks the study answer together for the seat card with the three Friends picked, which takes its place', async () => {
    const user = await seatAnswer();

    await user.press(bar().getByRole('button', { name: ADD }));
    await user.press(pickRow(MIN_JUN.name));
    await user.press(pickRow(SEO_YEON.name));
    await user.press(pickRow(YU_NA.name));
    await user.press(pickDone());
    await pass(500);

    expect(server.received(ANSWERS).map(({ body }) => inputOf(body))).toEqual([
      {
        kind: 'study',
        date: '2026-11-02',
        what: 'any',
        people: [ME_ID, MIN_JUN.id, SEO_YEON.id, YU_NA.id].map((userId) => ({ userId, constraints: [] })),
        together: true,
        window: { from: '17:00', until: '18:00' },
        area: null,
        minutes: 60,
        chosen: { seatSpaceId: READING_ROOM.id, roomSpaceId: null },
      },
    ]);
    expect(screen.getByTestId('study-group-body')).toBeOnTheScreen();
  });
});

describe('"＋ 같이" on the seat answer alone, every Friend taken out again', () => {
  it('shows the seat card it kept, with no request, once every Friend is taken out of that answer', async () => {
    const user = await seatAnswer();
    await user.press(bar().getByRole('button', { name: ADD }));
    await user.press(pickRow(MIN_JUN.name));
    await user.press(pickDone());
    await pass(500);
    const asked = server.received(ANSWERS).length;

    await user.press(bar().getByRole('button', { name: /^같이 \d+ ›$|같이 공부할 친구 추가/u }));
    while (checkedRows().length > 0) {
      const [row] = within(screen.getByTestId('time-card-rows')).getAllByRole('checkbox', { checked: true });
      if (row === undefined) {
        break;
      }
      // oxlint-disable-next-line no-await-in-loop -- one press at a time
      await user.press(row);
    }
    await user.press(pickDone());
    await pass(500);

    expect(server.received(ANSWERS)).toHaveLength(asked);
    expect(screen.queryByTestId('study-group-body')).toBeNull();
    expect(bar().getByText('17:00–18:00 · 1시간')).toBeVisible();
    expect(screen.getByRole('button', { name: '예약하기' })).toBeOnTheScreen();
  });
});

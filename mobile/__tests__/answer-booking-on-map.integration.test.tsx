/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import type { Place } from '@/api/types';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapLines, mapThings } from './support/answer-map';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, expectNoWrite, SEAT_CARD, sendFromBar, startLibraryChat } from './support/library-chat';
import { openMain } from './support/main';
import { markLibraryLoggedIn } from '@/library/flag';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';

// P04 ticket 07: a 관정도서관 seat card stands on the map as a flag on 관정관 with the room, the seat, and the time, my
// walk there, its band on the top bar, and its 예약하기 beside the input. P01 ticket 03: lowered, the card says one
// sentence with the room, the time, and the free seats; raised, it holds the room chip, the seat, and the rest. The
// phone's clock stands on Monday 2026-11-02 at 16:00 in Korea; the card is for 7층 7A 열람실 2 구역 today from 17:00
// for an hour.

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
const FLAG = /^관정 7층 열람실 › · (\d+번 )?17:00–18:00( · 걸음 \d+분)?$/u;
const CHIP = '열람실: 7층 열람실';
const DOCKED = /^관정 7층 열람실에 17:00부터 1시간, 빈 자리 \d+석이에요\.$/u;

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

    expect(flagName()).toMatch(/^관정 7층 열람실 › · \d+번 17:00–18:00( · 걸음 \d+분)?$/u);
    expect(mapLines()).toHaveLength(1);
    expect(bar().getByText('17:00–18:00 · 1시간')).toBeVisible();
    expect(screen.getByRole('button', { name: '예약하기' })).toBeEnabled();
    const card = within(screen.getByTestId('answer-card'));
    expect(card.getByText(DOCKED)).toBeVisible();
    expect(card.getByText('올리면 자리·열람실')).toBeVisible();
    expect(card.queryByText('카드에서 확인해 주세요.')).toBeNull();
    expect(card.queryByRole('button', { name: CHIP })).toBeNull();
    expectNoWrite(library);
  });

  it("changes the card's end by a step of the bar's end, as the band did", async () => {
    await asked();

    await fireEvent(bar().getByRole('adjustable', { name: '끝 시각' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    await pass(500);

    expect(bar().getByText('17:00–18:30 · 1시간 30분')).toBeVisible();
    expect(screen.getByText(/^관정 7층 열람실에 17:00부터 1시간 30분, 빈 자리 \d+석이에요\.$/u)).toBeVisible();
    expect(screen.queryByText(/바꾼 시간이에요/u)).toBeNull();
    expect(mapThings()).toContainEqual(expect.stringMatching(/17:00–18:30( · 걸음 \d+분)?$/u));
    expectNoWrite(library);
  });

  it('says 로그인 beside the input while logged out of the library', async () => {
    await asked(false);

    expect(mapThings()).toContainEqual(expect.stringMatching(/^관정 7층 열람실 › · 17:00–18:00( · 걸음 \d+분)?$/u));
    expect(screen.getAllByRole('button', { name: '로그인' })).toHaveLength(1);
    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '로그인' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '예약하기' })).toBeNull();
  });
});

describe("the booking's flag", () => {
  it('opens 다른 자리 고르기 from its flag, which opens the seat picture', async () => {
    const { user } = await asked();

    await pressMarker(user, flagName());
    const rows = within(screen.getByTestId('mark-card'));
    await user.press(rows.getByRole('button', { name: '다른 자리 고르기' }));
    await pass(500);

    expect(screen.getByText('관정 7층 열람실 좌석 현황')).toBeVisible();
    expect(screen.getByRole('button', { name: '좌석 현황 닫기' })).toBeVisible();
    expectNoWrite(library);
  });

  it("names the room once in the flag's card", async () => {
    const { user } = await asked();

    await pressMarker(user, flagName());
    const rows = within(screen.getByTestId('mark-card'));

    expect(rows.getAllByText(/열람실/u)).toHaveLength(1);
  });
});

async function raised(): Promise<Awaited<ReturnType<typeof asked>>> {
  const chat = await asked();
  await chat.user.press(screen.getByText('올리면 자리·열람실'));
  await pass(500);
  return chat;
}

// P01 ticket 03: the raised card holds what the lowered one leaves out.
describe('the raised seat card on the map', () => {
  it('opens with the sentence, then the room chip, the seat with its time, 다른 자리 고르기, and the kiosk foot', async () => {
    await raised();
    const card = within(screen.getByTestId('answer-card'));

    expect(card.getByText(DOCKED)).toBeVisible();
    expect(card.queryByText('카드에서 확인해 주세요.')).toBeNull();
    expect(card.getByRole('button', { name: CHIP })).toBeVisible();
    expect(card.getByText(/^관정 7층 열람실 · \d+번$/u)).toBeVisible();
    expect(card.getByText(/^빈 자리 \d+석$/u)).toBeVisible();
    expect(card.getByRole('button', { name: '다른 자리 고르기' })).toBeVisible();
    expect(card.getByText(/좌석배정기에서 확인해야 해요/u)).toBeVisible();
    expectNoWrite(library);
  });

  it('keeps 예약하기 in place, disabled, while the rooms are listed', async () => {
    const { user } = await raised();

    await user.press(within(screen.getByTestId('answer-card')).getByRole('button', { name: CHIP }));
    await pass(500);

    expect(screen.getByText('어느 열람실로 할까요?')).toBeVisible();
    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '예약하기' })).toBeDisabled();
    expectNoWrite(library);
  });
});

// P01 ticket 03: after the booking, 확인 is the main button and closes the answer.
describe('a seat booked on the map', () => {
  it('says what was booked, and 확인 beside the input closes the answer', async () => {
    const { user } = await asked();

    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '예약하기' }));
    await pass(500);

    expect(screen.getByTestId('library-done')).toBeVisible();
    expect(screen.getByText('✓ 예약했어요')).toBeVisible();
    expect(screen.getByText(/^관정 7층 열람실 \d+번 · 오늘 17:00–18:00$/u)).toBeVisible();
    expect(screen.queryByText('카드에서 확인해 주세요.')).toBeNull();
    expect(screen.queryByText('예약했어요')).toBeNull();
    expect(mapThings()).toContainEqual(expect.stringMatching(/^관정 7층 열람실 › · \d+번 17:00–18:00 · 예약됨$/u));
    expect(screen.queryByTestId('time-bar')).toBeNull();
    expect(screen.getByTestId('answer-back')).toHaveStyle({ backgroundColor: color.surface });
    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '확인' }));
    await pass(500);

    expect(screen.queryByTestId('answer-card')).toBeNull();
  });
});

// PR 460's review: the seat card of several requests (P03) is never left without its 예약하기. With the steps on the map
// (P04 ticket 09) the seat is step ①, shown first, and its 예약하기 stands beside the input.
describe('a seat card that is one of several requests', () => {
  it('is step ① on the map, with 예약하기 beside the input', async () => {
    const reply = stepsReplyOn('2026-11-02');
    await markLibraryLoggedIn();
    server.on('POST /assistant/messages', { status: 200, body: reply });
    const user = await openMain();
    await layStage(390, 760);
    await sendFromBar(user, '17시 반에 관정 갔다가 19시쯤 저녁 먹을래');
    await pass(500);

    expect(mapThings()).toContainEqual(expect.stringMatching(/^1 관정 7층 열람실 ›/u));
    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '예약하기' })).toBeVisible();
    expectNoWrite(library);
  });
});

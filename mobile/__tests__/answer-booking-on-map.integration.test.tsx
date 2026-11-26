/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import type { Place } from '@/api/types';
import { grip, raiseCard } from './support/card-grip';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapLines, mapThings } from './support/answer-map';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, expectNoWrite, SEAT_CARD, sendFromBar, startLibraryChat } from './support/library-chat';
import { openMain } from './support/main';
import { DINNER } from './support/server';
import { text } from '@/design-system';
import { LOW_LINES } from '@/screens/main/answer/card-caps';
import { ticketHeightAt } from '@/screens/main/library/seat-ticket';
import { styleOf } from './support/seat-ticket';
import type { Quest } from '@/api/types';
import { markLibraryLoggedIn } from '@/library/flag';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';

// P04 ticket 07: a 관정도서관 seat card stands on the map as a flag on 관정관 with the room, the seat, and the time, my
// walk there, its band on the top bar, and its 예약하기 beside the input. P01 ticket 03: lowered, the card says one
// sentence with the room, the time, and the free seats; raised, it holds the seat ticket and the rest (P01 ticket 09). The
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
const FLAG = /^관정 7층 열람실 · 17:00( · \d+번)?( · 빈 자리 \d+석)?$/u;
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

    // The room and the start, then the seat and the free seats (P01 ticket 10).
    expect(flagName()).toMatch(/^관정 7층 열람실 · 17:00 · \d+번 · 빈 자리 \d+석$/u);
    expect(mapLines()).toHaveLength(1);
    expect(bar().getByText('17:00–18:00 · 1시간')).toBeVisible();
    // The meal's time card, its band and grip, and no band of the library's own (P01 ticket 14).
    expect(bar().getByTestId('time-band-track')).toBeOnTheScreen();
    expect(screen.getByTestId('time-card-grip')).toBeOnTheScreen();
    expect(bar().queryByTestId('slot-band')).toBeNull();
    expect(screen.getByRole('button', { name: '예약하기' })).toBeEnabled();
    const card = within(screen.getByTestId('answer-card'));
    // The ticket says the room, the seat and the free seats, and the time bar the time: no sentence repeats them
    // (P01 ticket 09).
    expect(card.queryByText(DOCKED)).toBeNull();
    expect(card.queryByText('카드에서 확인해 주세요.')).toBeNull();
    // One sheet, laid out once (P04 ticket 61): the ticket is in it at low too.
    expect(card.getByRole('button', { name: CHIP })).toBeOnTheScreen();
    expectNoWrite(library);
  });

  it("changes the card's end by a step of the bar's end, as the band did", async () => {
    await asked();

    await fireEvent(bar().getByRole('adjustable', { name: '끝 시각' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    await pass(500);

    expect(bar().getByText('17:00–18:30 · 1시간 30분')).toBeVisible();
    expect(screen.queryByText(/석이에요\.$/u)).toBeNull();
    expect(screen.queryByText(/바꾼 시간이에요/u)).toBeNull();
    // The label keeps the start; the time card says the end (P01 ticket 10).
    expect(mapThings()).toContainEqual(expect.stringMatching(/^관정 7층 열람실 · 17:00 · \d+번/u));
    expectNoWrite(library);
  });

  it('says 로그인 beside the input while logged out of the library', async () => {
    await asked(false);

    expect(mapThings()).toContain('관정 7층 열람실 · 17:00');
    expect(screen.getAllByRole('button', { name: '로그인' })).toHaveLength(1);
    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '로그인' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '예약하기' })).toBeNull();
  });
});

// P01 ticket 10, the user's words: a press on the 관정 mark or its label does what a press on a meal's chosen place
// does, and raises the answer's card; no card of its own opens over the map.
describe("the booking's mark", () => {
  it('raises the card to the middle from its mark, with no card of its own', async () => {
    const { user } = await asked();
    expect(grip()).toBeCollapsed();

    await pressMarker(user, flagName());

    expect(screen.queryByTestId('mark-card')).toBeNull();
    expect(grip()).toHaveAccessibilityValue({ text: '중간' });
    expectNoWrite(library);
  });
});

async function raised(): Promise<Awaited<ReturnType<typeof asked>>> {
  const chat = await asked();
  await raiseCard();
  await pass(500);
  return chat;
}

// P01 ticket 03 and P04 ticket 61: the raised card holds the whole seat card, which the low one cuts at the footer.
describe('the raised seat card on the map', () => {
  it('opens with the ticket with the room and the seat, with no sentence over it, no pills and no kiosk line', async () => {
    await raised();
    const card = within(screen.getByTestId('answer-card'));
    const ticket = within(card.getByTestId('seat-ticket'));

    expect(card.queryByText(DOCKED)).toBeNull();
    expect(card.queryByText('카드에서 확인해 주세요.')).toBeNull();
    expect(card.getByRole('button', { name: CHIP })).toBeVisible();
    expect(ticket.getByText(/^\d+번$/u)).toBeVisible();
    expect(ticket.getByText(/^빈 자리 \d+석$/u)).toBeVisible();
    expect(card.queryByText(/^관정 7층 열람실 · \d+번$/u)).toBeNull();
    expect(card.queryByRole('button', { name: '다른 자리 고르기' })).toBeNull();
    expect(card.queryByText(/좌석배정기에서 확인해야 해요/u)).toBeNull();
    expectNoWrite(library);
  });

  it('stands whole at the low step: what stands over the ticket and the ticket fit its two lines (P01 ticket 09)', async () => {
    await asked();

    // The user's phone and the emulator at the lowest step: the ticket's bottom cut, 8 points too low.
    const over = styleOf(screen.getByTestId('library-cards')).marginTop ?? 0;
    expect(Number(over) + ticketHeightAt(1)).toBeLessThanOrEqual(LOW_LINES * text.bodyLg.lineHeight);
  });

  it("opens the seat picture from the ticket's seat (P01 ticket 09)", async () => {
    const { user } = await raised();

    await user.press(within(screen.getByTestId('answer-card')).getByRole('button', { name: /^좌석: \d+번$/u }));
    await pass(500);

    expect(screen.getByText('관정 7층 열람실 좌석 현황')).toBeVisible();
    expect(screen.getByRole('button', { name: '좌석 현황 닫기' })).toBeVisible();
  });

  it('keeps 예약하기 in place, disabled, while the rooms are listed', async () => {
    const { user } = await raised();

    await user.press(within(screen.getByTestId('answer-card')).getByRole('button', { name: CHIP }));
    await pass(500);

    expect(screen.getByText('17:00–18:00에 빈 자리')).toBeVisible();
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
    expect(mapThings()).toContainEqual(expect.stringMatching(/^관정 7층 열람실 · 17:00 · \d+번 · 예약됨$/u));
    expect(screen.queryByTestId('time-bar')).toBeNull();
    expect(screen.getByText(/^걸음 \d+분( ·|이라) /u)).toBeVisible();
    expect(within(screen.getByTestId('library-done')).getByRole('button', { name: '길 안내' })).toBeVisible();
    expect(within(screen.getByTestId('answer-card')).getByRole('button', { name: '답 닫기' })).toBeVisible();
    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '확인' }));
    await pass(500);

    expect(screen.queryByTestId('answer-card')).toBeNull();
  });
});

// P01 ticket 17: the time card shows the rest of the day, from now floored to the hour to closing.
describe("a seat card's time card", () => {
  it('runs from now, 16:00, to closing', async () => {
    await asked();

    expect(bar().getByTestId('time-band-start')).toHaveTextContent('16:00');
    expect(bar().getByTestId('time-band-end')).toHaveTextContent('23:00');
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

// P01 ticket 05: the seat bar knows the User's day, as a meal's bar does. The Quests of 2026-11-02: a Class at 301동
// until 15:45, a Class at 302동 from 17:30, inside the band of 17:00 to 18:00, and a dinner at 19:00. Expected values:
// worked by hand from those times.
const nov2 = (clock: string): string => `2026-11-02T${clock}:00+09:00`;

function onNov2(id: string, title: string, start: string, end: string, label: string, classQuest: boolean): Quest {
  const [sub] = DINNER.subQuests;
  if (sub === undefined) {
    throw new Error('DINNER has no Sub Quest');
  }
  const place = { placeId: null, label, latitude: null, longitude: null };
  return {
    ...DINNER,
    id,
    title,
    classQuest,
    subQuests: [{ ...sub, id: `${id}-1`, title, startsAt: nov2(start), endsAt: nov2(end), place }],
  };
}

describe("the seat bar's day", () => {
  it('draws the Classes and Quests on the track, names what bounds it before, and says the Class it runs into', async () => {
    server.on('GET /quests', {
      status: 200,
      body: [
        onNov2('c1', '자료구조', '13:00', '15:45', '301동 118호', true),
        onNov2('c2', '운영체제', '17:30', '18:45', '302동 208호', true),
        onNov2('q1', '저녁 약속', '19:00', '20:00', '학생회관', false),
      ],
    });

    await asked();

    // In the meal's time card (P01 ticket 14): the busy stretches on the User's lane, the part the band runs into red,
    // the words, and what ends before it between the track's ends.
    const lane = within(bar().getByTestId('time-band-lane-me'));
    expect(lane.getAllByTestId('time-band-clash')).toHaveLength(1);
    expect(bar().getByTestId('time-band-words')).toHaveTextContent('17:00–18:00 · 17:30 수업과 겹쳐요', {
      exact: true,
    });
    // Between the ends, what bounds it before, as a meal's card says it: now (16:00), after the Class ended at 15:45.
    expect(within(bar().getByTestId('time-band-note')).getByText('16:00 지금')).toBeVisible();
    expect(screen.getByRole('button', { name: '예약하기' })).toBeEnabled();
  });
});

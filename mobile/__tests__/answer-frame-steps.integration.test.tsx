/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, type userEvent, within } from '@testing-library/react-native';
import type { ReplyStep } from '@/api/assistant-types';
import type { Place } from '@/api/types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { mapThings } from './support/answer-map';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { inFrame, SEAT_CARD, sendFromBar, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { openMain } from './support/main';
import { markLibraryLoggedIn } from '@/library/flag';

// One message that asked for a 관정 seat and then dinner (P03), against the fake main server and the fake library: the
// steps stand on the map as numbered flags with one span each on the bar (P04 ticket 09), the step due first shows its
// seat and its action beside the input, a press on another flag makes that one shown, and a step not done is one line
// in the card. A reply to one request shows no numbers.

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

const WORDS = '17시에 관정 갔다가 18시쯤 저녁 먹으려고 하는데 7층 예약하고 스케줄 짜줘';
const KWANJEONG = {
  placeId: 'a9b1c2d3-0000-4000-8000-000000000621',
  label: '62-1동',
  latitude: 37.45903,
  longitude: 126.95247,
};

const seatStep = (status: ReplyStep['status'] = 'shown'): ReplyStep => ({
  kind: 'seat',
  title: '7층 7A 열람실 2 구역',
  place: KWANJEONG,
  from: null,
  startAt: '2026-11-02T17:00:00+09:00',
  endAt: '2026-11-02T18:00:00+09:00',
  status,
  reason: status === 'shown' ? null : '열람실은 당일만 예약할 수 있어요',
  shows: status === 'shown' ? { kind: 'card', key: SEAT_CARD.library.key } : null,
});

const mealStep: ReplyStep = {
  kind: 'meal',
  title: '학생회관식당에서 저녁',
  place: { placeId: 'a9b1c2d3-0000-4000-8000-000000000063', label: '63동', latitude: 37.45932, longitude: 126.95058 },
  from: KWANJEONG,
  startAt: '2026-11-02T18:04:00+09:00',
  endAt: '2026-11-02T18:30:00+09:00',
  status: 'shown',
  reason: null,
  shows: { kind: 'answer' },
};

const KWANJEONG_PLACE: Place = {
  id: 'p62-1',
  number: '62-1',
  name: '중앙도서관 관정관',
  latitude: 37.45903,
  longitude: 126.95247,
};

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG_PLACE] });
  await markLibraryLoggedIn();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function ask(reply: object): Promise<ReturnType<typeof userEvent.setup>> {
  const body = {
    text: '자리 카드를 띄웠고, 18:04에 학생회관식당에서 먹어요.',
    mapButtons: [],
    proposal: null,
    ...reply,
  };
  server.on('POST /assistant/messages', { status: 200, body });
  const user = await openMain();
  await layStage(390, 760);
  await sendFromBar(user, WORDS);
  await pass(500);
  return user;
}

function beside(name: string): ReturnType<typeof screen.queryByRole> {
  return within(screen.getByTestId('ai-input-beside')).queryByRole('button', { name });
}

function flag(number: number): string | undefined {
  return mapThings().find((thing) => thing.startsWith(`${String(number)} `));
}

// P04 ticket 09: the steps stand on the map as numbered flags with one span each on the bar, in place of the list.
describe('A reply to a seat and then dinner', () => {
  it('draws ① 관정 and ② 63동 as flags, two numbered spans on the bar, and no list in the card', async () => {
    await ask({ cards: [SEAT_CARD], answer: MEAL_ANSWER, steps: [seatStep(), mealStep] });

    expect(flag(1)).toMatch(/^1 관정 7층 열람실 › · (\d+번 )?17:00–18:00$/u);
    expect(flag(2)).toBe('2 63동 › · 18:04–18:30');
    expect(screen.getByTestId('step-span-1')).toBeVisible();
    expect(screen.getByTestId('step-span-2')).toBeVisible();
    expect(inFrame().queryByTestId('reply-steps')).toBeNull();
    // PR 462's review: the seat step's card keeps its own band, and the meal's other candidates its stepper.
    expect(
      within(inFrame().getByTestId(`library-book-${SEAT_CARD.library.key}`)).getByTestId('slot-band'),
    ).toBeVisible();
    expect(inFrame().getByTestId('plan-stepper')).toBeVisible();
    expect(library.writes()).toEqual([]);
  });

  it("makes the seat the step shown, with its seat and 예약하기, and a press on ② makes the meal's button the button", async () => {
    const user = await ask({ cards: [SEAT_CARD], answer: MEAL_ANSWER, steps: [seatStep(), mealStep] });

    expect(flag(1)).toMatch(/^1 관정 7층 열람실 › · \d+번 17:00–18:00$/u);
    expect(beside('예약하기')).toBeVisible();
    expect(screen.getAllByTestId('time-bar')).toHaveLength(1);

    await pressMarker(user, flag(2) ?? '');
    await pass(100);

    expect(beside('만들고 초대 보내기')).toBeVisible();
    expect(beside('예약하기')).toBeNull();
    // The meal's own bar, with its handles, stands under the steps' bar while ② is shown.
    expect(screen.getAllByTestId('time-bar')).toHaveLength(2);
    expect(library.writes()).toEqual([]);
  });

  it('says why a step was not done in one line, and fades its flag', async () => {
    await ask({ cards: [], answer: MEAL_ANSWER, steps: [seatStep('not-done'), mealStep] });

    expect(within(inFrame().getByTestId('steps-not-done')).getByText('열람실은 당일만 예약할 수 있어요')).toBeVisible();
    expect(flag(1)).toBe('1 7층 7A 열람실 2 구역 › · 못 했어요');
    expect(beside('만들고 초대 보내기')).toBeVisible();
  });
});

describe('A reply to one request', () => {
  it('shows no numbers', async () => {
    await ask({ cards: [], answer: MEAL_ANSWER });

    expect(flag(1)).toBeUndefined();
    expect(screen.queryByTestId('step-span-1')).toBeNull();
    expect(beside('만들고 초대 보내기')).toBeVisible();
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, screen, type userEvent, within } from '@testing-library/react-native';
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

// One message that asked for a 관정 seat and then a meal (P03), as the steps stand after the User acts on them (P10
// ticket 29): booking the seat keeps the steps, the meal and the way on to it, and gives the seat's step its ticket's
// button; a candidate browsed on the meal's step moves its flag and span; the seat's time changed on its card moves
// its flag and span. Against the fake main server and the fake library, logged in; the phone's clock stands on Monday
// 2026-11-02 at 16:00 in Korea.

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
const KWANJEONG_PLACE: Place = {
  id: 'p62-1',
  number: '62-1',
  name: '중앙도서관 관정관',
  latitude: 37.45903,
  longitude: 126.95247,
};

const SEAT_STEP: ReplyStep = {
  kind: 'seat',
  title: '7층 7A 열람실 2 구역',
  place: KWANJEONG,
  from: null,
  startAt: '2026-11-02T17:00:00+09:00',
  endAt: '2026-11-02T18:00:00+09:00',
  status: 'shown',
  reason: null,
  shows: { kind: 'card', key: SEAT_CARD.library.key },
};

const MEAL_STEP: ReplyStep = {
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

async function askSteps(): Promise<ReturnType<typeof userEvent.setup>> {
  server.on('POST /assistant/messages', {
    status: 200,
    body: {
      text: '자리 카드를 띄웠고, 18:04에 학생회관식당에서 먹어요.',
      mapButtons: [],
      proposal: null,
      cards: [SEAT_CARD],
      answer: MEAL_ANSWER,
      steps: [SEAT_STEP, MEAL_STEP],
    },
  });
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

// Partitions: the seat booked; the meal's step after it. Expected values: a lone booking's "예약됨" and its ticket's
// 가는 길 (P01 ticket 03), and the meal's own button.
describe('The seat booked from the steps of a seat and a meal', () => {
  it('keeps the steps and the meal, says the seat is booked, and puts its ticket’s 가는 길 beside the input', async () => {
    const user = await askSteps();

    await user.press(beside('예약하기') ?? screen.getByText('예약하기'));
    await pass(500);

    expect(library.writes()).toHaveLength(1);
    expect(screen.getByTestId('step-span-1')).toBeVisible();
    expect(screen.getByTestId('step-span-2')).toBeVisible();
    expect(flag(1)).toMatch(/^1 관정 7층 열람실 › · \d+번 17:00–18:00 · 예약됨$/u);
    expect(flag(2)).toBe('2 63동 › · 18:04–18:30');
    expect(inFrame().getByTestId('plan-stepper')).toBeVisible();
    expect(beside('가는 길')).toBeVisible();
    expect(beside('만들고 초대 보내기')).toBeNull();
  });

  it('goes on to the meal: ② makes its button the button, and ① gives the ticket’s back', async () => {
    const user = await askSteps();
    await user.press(beside('예약하기') ?? screen.getByText('예약하기'));
    await pass(500);

    await pressMarker(user, flag(2) ?? '');
    await pass(100);
    expect(beside('만들고 초대 보내기')).toBeVisible();

    await pressMarker(user, flag(1) ?? '');
    await pass(100);
    expect(beside('가는 길')).toBeVisible();
  });
});

// Partitions: another candidate on the meal's step; another time on the seat's card. Expected values: the second
// Plan of the meal answer (301동식당, 12:18–12:45), and the card's end a step later (18:30).
describe('The steps of a seat and a meal, changed on screen', () => {
  it('moves the meal’s flag and span to the candidate browsed', async () => {
    const user = await askSteps();
    await pressMarker(user, flag(2) ?? '');
    await pass(100);

    await user.press(within(inFrame().getByTestId('plan-stepper')).getByRole('button', { name: '다음 후보' }));
    await pass(300);

    expect(flag(2)).toMatch(/^2 301동식당 · .*12:18–12:45$/u);
    expect(screen.getByLabelText(/^2번 .*12:18–12:45$/u)).toBeVisible();
  });

  it('moves the seat’s flag and span to the time its card holds', async () => {
    await askSteps();
    const band = within(
      within(inFrame().getByTestId(`library-book-${SEAT_CARD.library.key}`)).getByTestId('slot-band'),
    );

    await fireEvent(band.getByRole('adjustable', { name: '끝 시각' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    await pass(300);

    expect(flag(1)).toMatch(/17:00–18:30$/u);
    expect(screen.getByLabelText(/^1번 .*17:00–18:30$/u)).toBeVisible();
  });
});

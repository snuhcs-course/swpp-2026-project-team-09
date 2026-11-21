/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { ReplyStep } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { inFrame, SEAT_CARD, sendFromBar, startLibraryChat } from './support/library-chat';
import { openMain } from './support/main';
import { markLibraryLoggedIn } from '@/library/flag';

// One message that asked for a 관정 seat and then dinner (P03), against the fake main server and the fake library: the
// answer card numbers the steps in time order above the plan, says where a later one sets out from, points at the
// seat's card below, and says why a step was not done. A reply to one request shows no steps. The Plan holds no lines
// in the card (P04 ticket 04): its main button beside the input says it is on screen.

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

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  await markLibraryLoggedIn();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function ask(reply: object): Promise<void> {
  const body = {
    text: '자리 카드를 띄웠고, 18:04에 학생회관식당에서 먹어요.',
    mapButtons: [],
    proposal: null,
    ...reply,
  };
  server.on('POST /assistant/messages', { status: 200, body });
  const user = await openMain();
  await sendFromBar(user, WORDS);
}

function planOnScreen(): ReturnType<typeof screen.getByRole> {
  return within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' });
}

function row(order: number): ReturnType<typeof within> {
  return within(inFrame().getByTestId(`reply-step-${order}`));
}

describe('A reply to a seat and then dinner', () => {
  it('numbers both steps in time order above the plan, with where dinner sets out from', async () => {
    await ask({ cards: [SEAT_CARD], answer: MEAL_ANSWER, steps: [seatStep(), mealStep] });

    expect(row(1).getByText('17:00–18:00 7층 7A 열람실 2 구역')).toBeVisible();
    expect(row(1).getByText('예약 카드는 아래에 있어요')).toBeVisible();
    expect(row(2).getByText('18:04–18:30 학생회관식당에서 저녁 · 62-1동에서')).toBeVisible();
    expect(inFrame().queryByTestId('reply-step-3')).toBeNull();
  });

  it('keeps every step reachable: the plan and the seat card stay in the card', async () => {
    await ask({ cards: [SEAT_CARD], answer: MEAL_ANSWER, steps: [seatStep(), mealStep] });

    expect(planOnScreen()).toBeVisible();
    expect(inFrame().getByTestId(`library-book-${SEAT_CARD.library.key}`)).toBeVisible();
    expect(library.writes()).toEqual([]);
  });

  it('says why a step was not done, and still shows the plan after it', async () => {
    await ask({ cards: [], answer: MEAL_ANSWER, steps: [seatStep('not-done'), mealStep] });

    expect(row(1).getByText('17:00–18:00 7층 7A 열람실 2 구역')).toBeVisible();
    expect(row(1).getByText('열람실은 당일만 예약할 수 있어요')).toBeVisible();
    expect(row(2).getByText('18:04–18:30 학생회관식당에서 저녁 · 62-1동에서')).toBeVisible();
    expect(planOnScreen()).toBeVisible();
  });
});

describe('A reply to one request', () => {
  it('shows no steps, as before', async () => {
    await ask({ cards: [], answer: MEAL_ANSWER });

    expect(inFrame().queryByTestId('reply-steps')).toBeNull();
    expect(planOnScreen()).toBeVisible();
  });
});

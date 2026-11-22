/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { screen } from './support/app';
import { askOnMap, card, timeBar as bar } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 01: the time band leaves the card for a bar under the pill, folded to one row. Over the stored answer to
// "배고파, 민수랑 같이" (Tuesday 2026-11-17): its first Plan runs from 12:15 to 12:43, 나 is busy until 11:50 ("301동
// 수업") and from 13:00 ("24동 수업"), 민수 until 12:15 ("302동 수업"). The same answer asked on Monday is tomorrow's.

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

const UNFOLD = '사람별 시간 펼치기';
const FOLD = '사람별 시간 접기';

// The stored reply with every band's now on the Monday before.
const ASKED_ON_MONDAY: AssistantReply = {
  ...MEAL_ANSWER_REPLY,
  answer: {
    ...MEAL_ANSWER_REPLY.answer,
    plans: MEAL_ANSWER_REPLY.answer.plans.map((plan) => ({
      ...plan,
      band: { ...plan.band, now: '2026-11-16T11:50:00+09:00' },
    })),
  },
};

const WORDS_ONLY: AssistantReply = {
  text: '학생증은 학생지원센터에서 다시 받아요.',
  mapButtons: [],
  cards: [],
  proposal: null,
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the time bar', () => {
  it("stands under the pill with the span's words, and the card holds no band", async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(bar().getByText('12:15–12:43 · 식사 28분')).toBeVisible();
    expect(card().queryByTestId('time-band-track')).toBeNull();
  });

  it("says the span's day when it is not today", async () => {
    await askOnMap(server, ASKED_ON_MONDAY);

    expect(bar().getByText('내일(화) 점심 12:15–12:43 · 식사 28분')).toBeVisible();
  });

  it("is folded to one row, bounded by the busy stretches at the span's ends", async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(bar().queryByText('민수')).toBeNull();
    expect(bar().getByText('민수 12:15 302동 수업 끝')).toBeVisible();
    expect(bar().getByText('13:00 24동 수업')).toBeVisible();
  });

  it('unfolds to a row for each person at a press, and folds again', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await press(user, UNFOLD);

    expect(bar().getByText('나')).toBeVisible();
    expect(bar().getByText('민수')).toBeVisible();
    expect(bar().getByText('11:30')).toBeVisible();

    await press(user, FOLD);

    expect(bar().queryByText('민수')).toBeNull();
  });
});

describe('the folded bar', () => {
  it("lets the first lane's busy stretches show under the second lane's", async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    const [, minsu] = MEAL_ANSWER_REPLY.answer.plans[0]?.band.lanes ?? [];

    const lane = screen.getByTestId(`time-band-lane-${minsu?.userId ?? ''}`);

    expect(lane.children[0]).toHaveStyle({ backgroundColor: 'transparent' });
  });
});

describe('an answer without a time', () => {
  it('has no bar', async () => {
    await askOnMap(server, WORDS_ONLY);

    expect(screen.getByText('학생증은 학생지원센터에서 다시 받아요.')).toBeVisible();
    expect(screen.queryByTestId('time-bar')).toBeNull();
  });
});

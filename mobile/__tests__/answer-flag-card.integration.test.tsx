/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { AssistantReply } from '@/api/assistant-types';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { pressMarker } from './support/made-quest';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 02: the pick's flag says the day of a Plan that is not today's, and a press on it opens a card attached
// to it with what "이대로 초대" makes and the basis. Over the stored answer to "배고파, 민수랑 같이" (Tuesday 2026-11-17):
// its first Plan is "302동식당에서 점심" at 12:15 with 민수.

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

const PICK = '302동식당 · 12:15 점심';

// The stored reply asked on the Monday before.
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

const ALONE_REPLY: AssistantReply = { ...MEAL_ANSWER_REPLY, answer: MEAL_ANSWER_ALONE };

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

function flagCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('mark-card'));
}

describe("the pick's flag", () => {
  it('says 내일 with the weekday before the time of a Plan for tomorrow', async () => {
    const user = await askOnMap(server, ASKED_ON_MONDAY, () => layStage(390, 760));

    await pressMarker(user, '302동식당 · 내일(화) 12:15 점심');

    expect(flagCard().getByText('302동식당에서 점심')).toBeVisible();
  });

  it('opens what "이대로 초대" makes with 민수, and the basis', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));

    await pressMarker(user, PICK);

    const card = flagCard();
    expect(card.getByText('302동식당에서 점심')).toBeVisible();
    expect(card.getByText('비공개')).toBeVisible();
    expect(card.getByText('4명')).toBeVisible();
    expect(card.getByText('민수')).toBeVisible();
    expect(card.getByText('301동 → 302동식당 걸어서 3분')).toBeVisible();
  });

  it('shows only the title and the basis for a Plan alone', async () => {
    const user = await askOnMap(server, ALONE_REPLY, () => layStage(390, 760));
    const pick = MEAL_ANSWER_ALONE.plans[0];

    await pressMarker(user, `${pick?.place.label ?? ''} · 11:50 점심`);

    expect(flagCard().getByText(pick?.title ?? '')).toBeVisible();
    expect(flagCard().queryByText('정원')).toBeNull();
    expect(flagCard().queryByText('초대')).toBeNull();
  });

  it('closes at a press beside it', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));
    await pressMarker(user, PICK);

    await press(user, '카드 닫기');
    await pass(100);

    expect(screen.queryByTestId('mark-card')).toBeNull();
  });
});

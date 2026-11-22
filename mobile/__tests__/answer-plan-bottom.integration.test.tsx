/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { AssistantReply } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { NOT_NOW_ANSWER } from '@/api/mock/data/unmet-plans';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 04: a Plan's bottom holds no text by default, and its main button beside the input says what it does.
// Over the stored answer to "배고파, 민수랑 같이" (five Plans, the first at 302동식당 with 민수), the same answer for the
// User alone, and an answer with no Plan for three people ("지금은 셋이 먹을 때가 없어요").

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

const ALONE_REPLY: AssistantReply = { ...MEAL_ANSWER_REPLY, answer: MEAL_ANSWER_ALONE };
const NO_PLAN_REPLY: AssistantReply = {
  ...MEAL_ANSWER_REPLY,
  text: '지은이 12:00에 수업이라 지금은 어려워요.',
  answer: NOT_NOW_ANSWER,
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

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

describe("a Plan's bottom", () => {
  it('says nothing the map says, and sends the Plan from "만들고 초대 보내기" beside the input', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(card().queryByRole('button', { name: '301동에서' })).toBeNull();
    expect(card().queryByTestId('answer-lines')).toBeNull();
    expect(card().queryByText('1/5')).toBeNull();
    expect(card().queryByRole('button', { name: '이대로 초대' })).toBeNull();

    await user.press(beside().getByRole('button', { name: '만들고 초대 보내기' }));
    await pass(500);

    expect(server.received('POST /plans')).toHaveLength(1);
    expect(mapThings()).toContain('민수 · 아직 안 봄');
  });

  it('takes a Plan alone from "일정에 넣기"', async () => {
    const user = await askOnMap(server, ALONE_REPLY);

    await user.press(beside().getByRole('button', { name: '일정에 넣기' }));
    await pass(500);

    expect(server.received('POST /plans')).toHaveLength(1);
  });

  it('switches to candidate 2 at a press on its flag, with no arrows', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));

    await pressMarker(user, '후보 2 · 301동식당 · 12:18');

    expect(mapThings()).toContain('301동식당 · 12:18 점심');
  });
});

describe('a second turn', () => {
  it('stays docked with no "지난 답", and the caption\'s list keeps both questions (P04 ticket 10)', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.type(screen.getByLabelText(AI_INPUT), '다른 데는?');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    expect(card().queryByRole('button', { name: /^지난 답/u })).toBeNull();
    await user.press(screen.getByTestId('answer-caption'));
    const list = within(screen.getByTestId('question-list'));
    expect(list.getAllByTestId('question-row')).toHaveLength(2);
    expect(list.getByRole('button', { name: /다른 데는\?, .+, 지금$/u })).toBeVisible();
    expect(list.getByRole('button', { name: /배고파, 민수랑 같이, /u })).toBeVisible();
  });
});

describe('an answer without a Plan', () => {
  it('says why in one line, which opens the whole words at a press', async () => {
    const user = await askOnMap(server, NO_PLAN_REPLY);

    expect(card().getByText('지금은 셋이 먹을 때가 없어요')).toBeVisible();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();

    await user.press(
      card().getByRole('button', { name: '지금은 셋이 먹을 때가 없어요 지은이 12:00에 다시 수업이에요, 전체 보기' }),
    );

    expect(card().getByText('지은이 12:00에 수업이라 지금은 어려워요.')).toBeVisible();
  });
});

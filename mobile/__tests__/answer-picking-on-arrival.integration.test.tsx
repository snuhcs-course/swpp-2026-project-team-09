/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { AssistantReply } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, timeBar } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { checkedRows, pickCancel, pickDone, pickRows } from './support/picking';
import { CONTINUE } from './support/questions';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// A meal asked with company the User did not name (P04 ticket 73; the user's phone on 2026-11-26: "친구 두명이랑 저녁"
// was asked back for names). Its answer comes with `pickPeople`, and the time card opens the picking of Friends as it
// arrives, as if "＋ 같이" were pressed. Over the stored answers to a lunch for the User alone and with 민수, and the
// fake main server's Friends 김민준, nearest, and 서지우, whose position is not known.

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

const ADD = '같이 먹을 친구 추가';
// 김민준 walks 14 minutes to the plan alone's 301동식당 by the phone's guess.
const ROWS = ['김민준 · 걸음 14분', '서지우 · 위치 모름'];
const BACK = '답 닫기';

const ALONE_PICKING: AssistantReply = { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER_ALONE, pickPeople: true } };
const WITH_MINSU_PICKING: AssistantReply = {
  ...MEAL_ANSWER_REPLY,
  answer: MEAL_ANSWER_REPLY.answer === null ? null : { ...MEAL_ANSWER_REPLY.answer, pickPeople: true },
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

function picking(): boolean {
  return screen.queryByTestId('time-card-pick-done') !== null;
}

// Partitions: nobody named; one named and more to pick; a meal asked without it.
describe('a meal answer that asks for picking', () => {
  it('arrives with the picking of Friends open, nobody checked, and 취소 and 완료 in the head', async () => {
    await askOnMap(server, ALONE_PICKING);

    expect(pickRows()).toEqual(ROWS);
    expect(checkedRows()).toEqual([]);
    expect(pickDone()).toHaveTextContent(/^완료$/u);
    expect(pickCancel()).toBeVisible();
    expect(screen.getByTestId('time-card-grip')).toBeExpanded();
  });

  it('arrives with the Friend the User named checked', async () => {
    await askOnMap(server, WITH_MINSU_PICKING);

    expect(checkedRows()).toEqual(['민수 · 걸음 0분']);
  });

  it('opens nothing for a meal asked without it', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(picking()).toBe(false);
    expect(timeBar().getByRole('button', { name: ADD })).toBeVisible();
  });
});

// Partitions: the answer shown again by "이어서" after ✕; an earlier turn brought back from the caption's list.
describe('a picking answer shown again', () => {
  it('stays as the User left it when "이어서" shows it again', async () => {
    const user = await askOnMap(server, ALONE_PICKING);
    await user.press(pickCancel());

    await user.press(screen.getByRole('button', { name: BACK }));
    await user.press(screen.getByRole('button', { name: CONTINUE }));

    expect(picking()).toBe(false);
  });

  it('opens nothing when it comes back as an earlier turn of the conversation', async () => {
    const user = await askOnMap(server, ALONE_PICKING);
    await user.press(pickCancel());
    server.on('POST /assistant/messages', {
      status: 200,
      body: { text: '셔틀은 정문에 있어요.', mapButtons: [], cards: [], proposal: null },
    });
    await user.type(screen.getByLabelText(AI_INPUT), '셔틀 어디야');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    await user.press(screen.getByTestId('answer-caption'));
    // The list puts the latest question first: the meal is the last row.
    const [meal] = within(screen.getByTestId('question-list')).getAllByTestId('question-row').toReversed();
    if (meal === undefined) {
      throw new Error('The list has no question');
    }
    await user.press(meal);
    await pass(500);

    expect(picking()).toBe(false);
  });
});

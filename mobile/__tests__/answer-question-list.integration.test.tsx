/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { holdBackButton } from './support/back';
import { answerDining } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { answerShuttle } from './support/shuttle';

// P04 ticket 10 against the fake main server: the pill counts the conversation's questions and opens the list of every
// question kept (board 16), whose rows bring their answers back to the map; "＋ 새 대화" keeps the conversation in that
// list and leaves an empty, focused input under "지난 대화 N ▾" (board 27); ✕ and back close the answer in every state.

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

const MEAL = '배고파, 민수랑 같이';
const SHUTTLE = '셔틀 어디 있어?';
const GATE = '정문 셔틀은?';
const SHUTTLE_REPLY = '셔틀 두 대가 정문과 자연대에 있어요.';
const GATE_REPLY = '정문 셔틀이 먼저 와요.';
// A mark of the meal answer's first Plan on the map.
const PLAN_MARK = '302동식당 · 12:15 점심';
// PHONE_NOW, 04:00 UTC, in Korea.
const ASKED_AT = '13:00';
const HANDLE = '답 크게 보기';

let server: FakeServer;
let back: () => Promise<boolean>;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  back = holdBackButton();
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerShuttle(server);
  answerDining(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

function text(words: string): object {
  return { text: words, mapButtons: [], cards: [], proposal: null };
}

async function ask(user: User, words: string, body: object): Promise<void> {
  server.on('POST /assistant/messages', { status: 200, body, afterMs: 500 });
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

// The meal Plan, then two questions of words.
async function askedThrice(): Promise<User> {
  const user = await openMain();
  await ask(user, MEAL, MEAL_ANSWER_REPLY);
  await ask(user, SHUTTLE, text(SHUTTLE_REPLY));
  await ask(user, GATE, text(GATE_REPLY));
  return user;
}

function pill(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-pill'));
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function list(): ReturnType<typeof within> {
  return within(screen.getByTestId('question-list'));
}

async function openList(user: User): Promise<void> {
  await user.press(screen.getByTestId('answer-pill'));
}

function rowNames(): string[] {
  return list()
    .getAllByRole('button')
    .map((row) => String(row.props.accessibilityLabel));
}

function expectClosed(): void {
  expect(screen.queryByTestId('answer-pill')).toBeNull();
  expect(screen.queryByTestId('answer-card')).toBeNull();
}

// Partitions: three questions in one conversation; a row of an earlier turn.
describe("the pill's list of questions", () => {
  it('counts the questions on the pill and lists them under 새 대화, the latest first, each with its time and outcome', async () => {
    const user = await askedThrice();

    expect(within(screen.getByTestId('answer-pill-count')).getByText('3')).toBeVisible();
    await openList(user);

    expect(rowNames()).toEqual([
      '새 대화, 지금 대화는 지워지지 않고 아래에 남아요',
      `${ASKED_AT}, ${GATE}, ${GATE_REPLY}, 지금`,
      `${ASKED_AT}, ${SHUTTLE}, ${SHUTTLE_REPLY}`,
      `${ASKED_AT}, ${MEAL}, 302동식당 12:15 · 아직 만들지 않음`,
    ]);
  });

  it("brings the first question's Plan back to the map, and the next message goes on from the latest turn", async () => {
    const user = await askedThrice();
    await openList(user);

    await user.press(list().getByRole('button', { name: new RegExp(`^${ASKED_AT}, ${MEAL}`, 'u') }));

    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(pill().getByText(MEAL)).toBeVisible();
    expect(screen.getByLabelText(PLAN_MARK)).toBeOnTheScreen();
    await ask(user, '고마워', text('천만에요.'));
    const latest: unknown = expect.arrayContaining([
      { role: 'user', text: GATE },
      expect.objectContaining({ role: 'assistant', text: GATE_REPLY }),
      { role: 'user', text: '고마워' },
    ]);
    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual(
      expect.objectContaining({ messages: latest }),
    );
    expect(pill().getByText('고마워')).toBeVisible();
  });
});

// Partitions: an earlier turn that failed, opened from the list (PR 451's review).
describe('an earlier turn that failed', () => {
  it('shows no 다시 시도 and puts no words back in the input, which act on the latest turn only', async () => {
    const user = await openMain();
    server.on('POST /assistant/messages', { status: 500, body: {}, afterMs: 500 });
    await user.type(screen.getByLabelText(AI_INPUT), SHUTTLE);
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);
    // The failed words stand in the input again; the next question is typed in their place.
    await user.clear(screen.getByLabelText(AI_INPUT));
    await ask(user, GATE, text(GATE_REPLY));
    await openList(user);

    await user.press(list().getByRole('button', { name: `${ASKED_AT}, ${SHUTTLE}, 답을 가져오지 못함` }));

    expect(pill().getByText(SHUTTLE)).toBeVisible();
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toHaveDisplayValue('');
  });
});

// Partitions: "＋ 새 대화" at the top; the list's own row; a message after it.
describe('"새 대화"', () => {
  it('closes the answer for an empty, focused input under "지난 대화 1", whose list brings the conversation back', async () => {
    const user = await askedThrice();
    const focus = jest.spyOn(TextInput.prototype, 'focus');

    await user.press(screen.getByRole('button', { name: '새 대화' }));

    expectClosed();
    expect(screen.getByLabelText(AI_INPUT)).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText('새로 물어보기 · 예: 공부할 자리')).toBeVisible();
    expect(focus).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^이전 답/u })).toBeNull();
    await user.press(screen.getByRole('button', { name: '지난 대화 1개' }));
    await user.press(list().getByRole('button', { name: new RegExp(`^${ASKED_AT}, ${SHUTTLE}`, 'u') }));

    expect(pill().getByText(SHUTTLE)).toBeVisible();
    expect(card().getByText(SHUTTLE_REPLY)).toBeVisible();
    expect(within(screen.getByTestId('answer-pill-count')).getByText('3')).toBeVisible();
  });

  it("starts anew from the list's own row", async () => {
    const user = await askedThrice();
    await openList(user);

    await user.press(list().getByRole('button', { name: /^새 대화/u }));

    expectClosed();
    expect(screen.getByRole('button', { name: '지난 대화 1개' })).toBeVisible();
  });

  it('sends none of the old conversation with the next message, and lists both conversations', async () => {
    const user = await askedThrice();
    await user.press(screen.getByRole('button', { name: '새 대화' }));

    await ask(user, '배고파', text('어디서 먹을까요?'));

    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual(
      expect.objectContaining({ messages: [{ role: 'user', text: '배고파' }] }),
    );
    expect(within(screen.getByTestId('answer-pill-count')).getByText('1')).toBeVisible();
    await openList(user);
    expect(list().getAllByTestId('question-row')).toHaveLength(4);
  });
});

// Partitions: ✕ with the card raised, with the keyboard up, with the list open; back through each layer.
describe('closing the answer', () => {
  it('closes with ✕ while the card is raised, the keyboard is up, or the list is open', async () => {
    const user = await askedThrice();

    await user.press(screen.getByRole('button', { name: HANDLE }));
    await user.press(pill().getByRole('button', { name: '답 닫기' }));
    expectClosed();

    await user.press(screen.getByRole('button', { name: /^이전 답/u }));
    await showKeyboard(KEYBOARD);
    await user.press(pill().getByRole('button', { name: '답 닫기' }));
    expectClosed();

    await user.press(screen.getByRole('button', { name: /^이전 답/u }));
    await openList(user);
    await user.press(pill().getByRole('button', { name: '답 닫기' }));
    expectClosed();
  });

  it('takes one layer away per back press: the list, the raised card, then the answer', async () => {
    const user = await askedThrice();
    await user.press(screen.getByRole('button', { name: HANDLE }));
    await openList(user);

    expect(await back()).toBe(true);
    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(screen.getByRole('button', { name: HANDLE })).toBeExpanded();

    expect(await back()).toBe(true);
    expect(screen.getByRole('button', { name: HANDLE })).toBeCollapsed();

    expect(await back()).toBe(true);
    expectClosed();
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { holdBackButton } from './support/back';
import { answerDining } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { hideKeyboard, KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { answerShuttle } from './support/shuttle';
import { CONTINUE, reopenAnswer } from './support/questions';

// P04 ticket 10 against the fake main server, as the 2026-11-22 redesign has it: the caption of what was asked opens,
// in the answer's card, the list of every question kept (board 16), whose rows bring their answers back to the map;
// what is typed on the main map starts a new conversation and keeps the old one in that list (rule 4); "←" and back
// close the answer in every state (rule 2).

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
const NEW = '배고파';
const NEW_REPLY = '어디서 먹을까요?';
// A mark of the meal answer's first Plan on the map.
const PLAN_MARK = '302동식당 · 12:15 점심';
// PHONE_NOW, 04:00 UTC, in Korea.
const ASKED_AT = '13:00';
const HANDLE = '답 크게 보기';
const BACK = '뒤로';

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

function caption(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-caption'));
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function list(): ReturnType<typeof within> {
  return within(screen.getByTestId('question-list'));
}

async function openList(user: User): Promise<void> {
  await user.press(screen.getByTestId('answer-caption'));
}

function rowNames(): string[] {
  return list()
    .getAllByTestId('question-row')
    .map((row) => String(row.props.accessibilityLabel));
}

function expectClosed(): void {
  expect(screen.queryByTestId('answer-back')).toBeNull();
  expect(screen.queryByTestId('answer-card')).toBeNull();
}

// Partitions: three questions in one conversation; the caption pressed once and twice; a row of an earlier turn.
describe("the caption's list of questions", () => {
  it('lists every question in the card, the latest first, each with its time and outcome', async () => {
    const user = await askedThrice();
    expect(screen.getByRole('button', { name: `${GATE}, 이전 질문 보기` })).toBeCollapsed();

    await openList(user);

    expect(screen.getByRole('button', { name: `${GATE}, 이전 질문 닫기` })).toBeExpanded();
    expect(card().getByTestId('question-list')).toBeVisible();
    expect(rowNames()).toEqual([
      `${ASKED_AT}, ${GATE}, ${GATE_REPLY}, 지금`,
      `${ASKED_AT}, ${SHUTTLE}, ${SHUTTLE_REPLY}`,
      `${ASKED_AT}, ${MEAL}, 302동식당 12:15 · 아직 만들지 않음`,
    ]);
  });

  it('closes again with a second press on the caption, the reply back in the card', async () => {
    const user = await askedThrice();
    await openList(user);

    await openList(user);

    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(card().getByText(GATE_REPLY)).toBeVisible();
  });

  it("brings the first question's Plan back to the map, and the next message goes on from the latest turn", async () => {
    const user = await askedThrice();
    await openList(user);

    await user.press(list().getByRole('button', { name: new RegExp(`^${ASKED_AT}, ${MEAL}`, 'u') }));

    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(caption().getByText(MEAL)).toBeVisible();
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
    expect(caption().getByText('고마워')).toBeVisible();
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

    expect(caption().getByText(SHUTTLE)).toBeVisible();
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toHaveDisplayValue('');
  });
});

// The conversation of three questions closed with "←", then a question typed on the main map.
async function askedAnew(): Promise<User> {
  const user = await askedThrice();
  await user.press(screen.getByRole('button', { name: BACK }));
  await ask(user, NEW, text(NEW_REPLY));
  return user;
}

// Partitions: the new conversation's message and list; an earlier conversation's row, and a message after it (rule 4).
describe('a question typed on the main map while a conversation is kept', () => {
  it('starts a conversation of its own, whose list holds both conversations', async () => {
    const user = await askedAnew();

    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual(
      expect.objectContaining({ messages: [{ role: 'user', text: NEW }] }),
    );
    expect(caption().getByText(NEW)).toBeVisible();
    expect(screen.queryByRole('button', { name: CONTINUE })).toBeNull();
    await openList(user);
    // The kept conversation is one row since P04 ticket 49: its first question, and its last one's outcome.
    expect(rowNames()).toEqual([
      `${ASKED_AT}, ${NEW}, ${NEW_REPLY}, 지금`,
      `${ASKED_AT}, ${MEAL}, 질문 3개 · ${GATE_REPLY}`,
    ]);
  });

  it('brings the earlier conversation back from its row, and the next message goes on from it alone', async () => {
    const user = await askedAnew();
    await openList(user);

    await user.press(list().getByRole('button', { name: new RegExp(`^${ASKED_AT}, ${MEAL}, 질문 3개`, 'u') }));

    expect(caption().getByText(GATE)).toBeVisible();
    expect(card().getByText(GATE_REPLY)).toBeVisible();
    await ask(user, '고마워', text('천만에요.'));
    const body = server.received('POST /assistant/messages').at(-1)?.body;
    const earlier: unknown = expect.arrayContaining([
      { role: 'user', text: GATE },
      { role: 'user', text: '고마워' },
    ]);
    const notNew: unknown = expect.not.arrayContaining([{ role: 'user', text: NEW }]);
    expect(body).toEqual(expect.objectContaining({ messages: earlier }));
    expect(body).toEqual(expect.objectContaining({ messages: notNew }));
  });
});

// P04 tickets 44 and 49: the list's header is its title alone; a new question is the card's own "＋", not the list's.
describe("the caption's list header", () => {
  it('titles the list "이전 질문", with no "새 대화" of its own', async () => {
    const user = await askedThrice();

    await openList(user);

    expect(list().getByText('이전 질문')).toBeVisible();
    expect(list().queryByRole('button', { name: '새 대화' })).toBeNull();
  });
});

// Partitions: "←" with the card raised, with the keyboard up, with the list open; back through each layer.
describe('closing the answer', () => {
  it('closes with "←" while the card is raised, the keyboard is up, or the list is open', async () => {
    const user = await askedThrice();

    await user.press(screen.getByRole('button', { name: HANDLE }));
    await user.press(screen.getByRole('button', { name: BACK }));
    expectClosed();

    await reopenAnswer(user);
    await showKeyboard(KEYBOARD);
    await user.press(screen.getByRole('button', { name: BACK }));
    expectClosed();

    // The tests' phone has no keyboard of its own to put down.
    await hideKeyboard();
    await reopenAnswer(user);
    await openList(user);
    await user.press(screen.getByRole('button', { name: BACK }));
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

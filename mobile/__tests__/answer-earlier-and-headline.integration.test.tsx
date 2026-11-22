/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { WAY_LOOKUP_REPLY } from '@/api/mock/data/way-lookup';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { hideKeyboard, KEYBOARD, quietDismiss, showKeyboard } from './support/keyboard';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { CAREER, MAJOR } from './support/events';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P02 tickets 32 and 35 against the fake main server: the answer card shows the turn on screen under its question, the
// card's caption (rule 5 of the 2026-11-22 redesign), and the earlier turns are in the caption's list (P04 ticket 10);
// while the keyboard is up the card shows the conversation's questions in place of the caption and the reply (board 6).

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

const ASKED = '배고파, 민수랑 같이';
const REPLY = '셔틀 두 대가 정문과 자연대에 있어요.\n정문 셔틀이 먼저 와요.';
const TEXT_REPLY = { text: REPLY, mapButtons: [], cards: [], proposal: null };
const EVENTS = [MAJOR, CAREER].map((globalEvent) => ({ kind: 'globalEvent', globalEvent }));
const EVENTS_REPLY = { text: '설명회 두 개가 있어요.', mapButtons: [], cards: EVENTS, proposal: null };
const PLAN_MARK = '302동식당 · 12:15 점심';

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

type User = Awaited<ReturnType<typeof openMain>>;

async function send(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
}

// Asks each of `turns` in turn, the main server answering each with its reply.
async function talk(turns: readonly (readonly [string, object])[]): Promise<User> {
  const user = await openMain();
  for (const [words, body] of turns) {
    server.on('POST /assistant/messages', { status: 200, body, afterMs: 500 });
    // One turn after the other, as the User talks.
    // oxlint-disable-next-line no-await-in-loop
    await send(user, words);
    // oxlint-disable-next-line no-await-in-loop
    await pass(500);
  }
  return user;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function caption(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-caption'));
}

function questions(): string[] {
  return within(screen.getByTestId('question-list'))
    .getAllByTestId('question-row')
    .map((row) => String(row.props.accessibilityLabel));
}

// Partitions: one turn, and several turns of a Plan, a Lookup, words, and cards.
describe('the turn on screen', () => {
  it("stands alone in the card with its question, the card's caption, over its reply", async () => {
    await talk([
      [ASKED, MEAL_ANSWER_REPLY],
      ['셔틀 어디 있어?', TEXT_REPLY],
    ]);

    expect(card().getByTestId('answer-caption')).toHaveTextContent('셔틀 어디 있어?');
    const drawn = JSON.stringify(screen.toJSON());
    expect(drawn.indexOf('셔틀 어디 있어?')).toBeLessThan(drawn.indexOf('정문 셔틀이 먼저 와요.'));
    expect(card().queryByText(ASKED)).toBeNull();
  });
});

// P04 ticket 10: "지난 답 N개" went; the earlier turns are the caption's list of questions.
describe('the earlier turns', () => {
  it("are not in the card, but in the caption's list, each with what it came to", async () => {
    const user = await talk([
      [ASKED, MEAL_ANSWER_REPLY],
      ['문화관이 어디야?', WAY_LOOKUP_REPLY],
      ['설명회 있어?', EVENTS_REPLY],
      ['셔틀 어디 있어?', TEXT_REPLY],
    ]);
    expect(card().queryByRole('button', { name: /^지난 답/u })).toBeNull();

    await user.press(screen.getByTestId('answer-caption'));

    expect(questions()).toEqual([
      '13:00, 셔틀 어디 있어?, 셔틀 두 대가 정문과 자연대에 있어요., 지금',
      '13:00, 설명회 있어?, 설명회 두 개가 있어요.',
      `13:00, 문화관이 어디야?, ${WAY_LOOKUP_REPLY.text}`,
      `13:00, ${ASKED}, 302동식당 12:15 · 아직 만들지 않음`,
    ]);
  });
});

// Partitions: a Plan's, a Lookup's and a sentence's reply.
describe('the card while the keyboard is up', () => {
  it("shows the conversation's question in place of the caption and the Plan, and leaves the map as it is", async () => {
    await talk([[ASKED, MEAL_ANSWER_REPLY]]);

    await showKeyboard(KEYBOARD);

    expect(questions()).toEqual([`13:00, ${ASKED}, 302동식당 12:15 · 아직 만들지 않음, 지금`]);
    expect(card().getByTestId('question-list')).toBeVisible();
    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(screen.queryByRole('button', { name: '같이 먹을 친구 추가' })).toBeNull();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();
    expect(screen.getByLabelText(PLAN_MARK)).toBeOnTheScreen();
  });

  it("names the Lookup's reply in its question's row, without the Lookup's buttons", async () => {
    await talk([['문화관이 어디야?', WAY_LOOKUP_REPLY]]);

    await showKeyboard(KEYBOARD);

    expect(questions()).toEqual([`13:00, 문화관이 어디야?, ${WAY_LOOKUP_REPLY.text}, 지금`]);
    expect(card().queryByRole('button', { name: '길 안내' })).toBeNull();
  });

  it("gives a sentence's reply its first line alone, the latest question first", async () => {
    await talk([
      [ASKED, MEAL_ANSWER_REPLY],
      ['셔틀 어디 있어?', TEXT_REPLY],
    ]);

    await showKeyboard(KEYBOARD);

    expect(questions()).toEqual([
      '13:00, 셔틀 어디 있어?, 셔틀 두 대가 정문과 자연대에 있어요., 지금',
      `13:00, ${ASKED}, 302동식당 12:15 · 아직 만들지 않음`,
    ]);
    expect(card().queryByText('정문 셔틀이 먼저 와요.')).toBeNull();
  });
});

// Partitions: the reply on its way; an earlier question pressed.
describe('the questions while the keyboard is up', () => {
  it('mark the question on its way as waiting, with neither the dots nor 그만', async () => {
    server.on('POST /assistant/messages', { status: 200, body: TEXT_REPLY, afterMs: 1000 });
    const user = await openMain();
    await send(user, '셔틀 어디 있어?');

    await showKeyboard(KEYBOARD);

    expect(questions()).toEqual(['13:00, 셔틀 어디 있어?, 답을 기다리는 중, 지금']);
    expect(card().queryByLabelText('보는 중')).toBeNull();
    expect(card().queryByRole('button', { name: '그만' })).toBeNull();
  });

  it('put the keyboard down when one is pressed, and show its turn', async () => {
    const user = await talk([
      [ASKED, MEAL_ANSWER_REPLY],
      ['셔틀 어디 있어?', TEXT_REPLY],
    ]);
    await showKeyboard(KEYBOARD);
    const dismiss = quietDismiss();

    await user.press(card().getByRole('button', { name: new RegExp(`^13:00, ${ASKED}`, 'u') }));
    // The tests' phone has no keyboard of its own to put down.
    await hideKeyboard();

    expect(dismiss).toHaveBeenCalled();
    expect(caption().getByText(ASKED)).toBeVisible();
  });
});

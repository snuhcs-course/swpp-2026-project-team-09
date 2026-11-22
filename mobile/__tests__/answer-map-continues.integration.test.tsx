/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerDining } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { answerShuttle } from './support/shuttle';
import { CONTINUE } from './support/questions';

// P04 ticket 11 against the fake main server, as board 1 of the 2026-11-22 redesign has it: with the answer closed and a
// conversation kept, the only thing above the input is the chip "이어서 · {question} ›", which shows that answer again.
// What is typed on the main map starts a new conversation (rule 4), and the kept one is listed under the new answer's
// caption, whose row takes it up again.

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

const SHUTTLE = '셔틀 어디 있어?';
const SHUTTLE_REPLY = '셔틀 두 대가 정문과 자연대에 있어요.';
const MEAL = '배고파';
const MEAL_REPLY = '어디서 먹을까요?';
const GATE = '정문 셔틀은?';
// PHONE_NOW, 04:00 UTC, in Korea.
const ASKED_AT = '13:00';
const NEW_PLACEHOLDER = '무엇이든 물어보세요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
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

function caption(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-caption'));
}

function list(): ReturnType<typeof within> {
  return within(screen.getByTestId('question-list'));
}

// What a screen reader says of each question's row of the list, the latest first; "＋ 새 질문" is not one.
function rowNames(): string[] {
  return list()
    .getAllByTestId('question-row')
    .map((row) => String(row.props.accessibilityLabel));
}

function lastSent(): unknown {
  return server.received('POST /assistant/messages').at(-1)?.body;
}

// Asks once and closes the answer with ✕.
async function closedAfterAsking(): Promise<User> {
  const user = await openMain();
  await ask(user, SHUTTLE, text(SHUTTLE_REPLY));
  await user.press(screen.getByRole('button', { name: '답 닫기' }));
  return user;
}

// Partitions: nothing kept; a conversation kept with the answer closed; a message typed on the main map.
describe('the map screen while nothing is kept', () => {
  it('has no chip, and its input asks for anything', async () => {
    await openMain();

    expect(screen.queryByTestId('past-chats')).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', NEW_PLACEHOLDER);
  });
});

describe('the map screen with a conversation kept', () => {
  it('has only the chip "이어서 · …" over the input, which still asks for anything', async () => {
    await closedAfterAsking();

    expect(screen.getByRole('button', { name: `이어서, ${SHUTTLE}` })).toBeVisible();
    expect(within(screen.getByTestId('past-chats')).getByText(`이어서 · ${SHUTTLE}`)).toBeVisible();
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', NEW_PLACEHOLDER);
    expect(screen.queryByRole('button', { name: '새 대화' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^지난 대화/u })).toBeNull();
    expect(screen.queryByRole('button', { name: /^이전 답/u })).toBeNull();
  });

  it('shows the answer again from the chip, with no list in between', async () => {
    const user = await closedAfterAsking();

    await user.press(screen.getByRole('button', { name: CONTINUE }));

    expect(caption().getByText(SHUTTLE)).toBeVisible();
    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(screen.queryByTestId('past-chats')).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', '이어서 말하기');
  });
});

describe('a message typed on the main map with a conversation kept', () => {
  it('starts a new conversation, whose request sends none of the old one', async () => {
    const user = await closedAfterAsking();

    await ask(user, MEAL, text(MEAL_REPLY));

    expect(lastSent()).toEqual(expect.objectContaining({ messages: [{ role: 'user', text: MEAL }] }));
    expect(caption().getByText(MEAL)).toBeVisible();
    expect(screen.queryByTestId('past-chats')).toBeNull();
  });

  it("lists the old one under the new answer's caption, whose row takes it up again", async () => {
    const user = await closedAfterAsking();
    await ask(user, MEAL, text(MEAL_REPLY));

    await user.press(screen.getByTestId('answer-caption'));
    expect(rowNames()).toEqual([
      `${ASKED_AT}, ${MEAL}, ${MEAL_REPLY}, 지금`,
      `${ASKED_AT}, ${SHUTTLE}, ${SHUTTLE_REPLY}`,
    ]);
    await user.press(list().getByRole('button', { name: `${ASKED_AT}, ${SHUTTLE}, ${SHUTTLE_REPLY}` }));

    expect(caption().getByText(SHUTTLE)).toBeVisible();
    await ask(user, GATE, text('정문 셔틀이 먼저 와요.'));
    expect(lastSent()).toEqual(
      expect.objectContaining({
        messages: [
          { role: 'user', text: SHUTTLE },
          { role: 'assistant', text: SHUTTLE_REPLY, cards: [] },
          { role: 'user', text: GATE },
        ],
      }),
    );
  });
});

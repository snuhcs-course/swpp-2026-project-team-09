/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { TextInput } from 'react-native';
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

// P04 ticket 11 against the fake main server: with the answer closed and a conversation kept, the map screen's chip
// names the question the next message continues and opens the list of questions, and "새 대화" beside the input starts
// a new conversation at one press (board 17); after it the chip is "지난 대화 N" (board 27).

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

function pill(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-pill'));
}

function list(): ReturnType<typeof within> {
  return within(screen.getByTestId('question-list'));
}

// Asks once and closes the answer with ✕.
async function closedAfterAsking(): Promise<User> {
  const user = await openMain();
  await ask(user, SHUTTLE, text(SHUTTLE_REPLY));
  await user.press(pill().getByRole('button', { name: '답 닫기' }));
  return user;
}

// Partitions: nothing kept; a conversation kept with the answer closed; "새 대화" beside the input.
describe('the map screen while nothing is kept', () => {
  it('has no chip and no "새 대화" beside the input', async () => {
    await openMain();

    expect(screen.queryByTestId('past-chats')).toBeNull();
    expect(screen.queryByRole('button', { name: '새 대화' })).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', '무엇이든 부탁해 보세요');
  });
});

describe('the map screen with a conversation kept', () => {
  it('names the question it continues, says "이어서 말하기", and has "새 대화" beside the input', async () => {
    await closedAfterAsking();

    expect(screen.getByRole('button', { name: `이어서, ${SHUTTLE}` })).toBeVisible();
    expect(within(screen.getByTestId('past-chats')).getByText(`이어서 · ${SHUTTLE}`)).toBeVisible();
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', '이어서 말하기');
    expect(screen.getByRole('button', { name: '새 대화' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^이전 답/u })).toBeNull();
  });

  it('opens the list from the chip, whose row brings the answer back', async () => {
    const user = await closedAfterAsking();

    await user.press(screen.getByRole('button', { name: CONTINUE }));
    await user.press(list().getByRole('button', { name: /셔틀 어디 있어\?/u }));

    expect(pill().getByText(SHUTTLE)).toBeVisible();
    expect(screen.queryByTestId('past-chats')).toBeNull();
  });

  it('starts a new conversation from "새 대화", whose message sends none of the old one, the old one listed', async () => {
    const user = await closedAfterAsking();
    const focus = jest.spyOn(TextInput.prototype, 'focus');

    await user.press(screen.getByRole('button', { name: '새 대화' }));

    expect(focus).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '지난 대화 1개' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '새 대화' })).toBeNull();
    await ask(user, '배고파', text('어디서 먹을까요?'));
    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual(
      expect.objectContaining({ messages: [{ role: 'user', text: '배고파' }] }),
    );
    await user.press(screen.getByTestId('answer-pill'));
    expect(list().getAllByTestId('question-row')).toHaveLength(2);
  });
});

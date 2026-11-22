/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
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

const MAP_PLACEHOLDER = '무엇이든 물어보세요';

// P04 tickets 11 and 33 against the fake main server: with the answer closed and a conversation kept, the map
// screen's chip names its question and brings its answer back at a press; the input beside it has no "새 대화", and a
// message from it always starts a new conversation, the old one kept among the earlier ones.

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

// Partitions: nothing kept; a conversation kept with the answer closed; a message from the main map.
describe('the map screen while nothing is kept', () => {
  it('has no chip and no "새 대화" beside the input, which says "무엇이든 물어보세요"', async () => {
    await openMain();

    expect(screen.queryByTestId('past-chats')).toBeNull();
    expect(screen.queryByRole('button', { name: '새 대화' })).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', MAP_PLACEHOLDER);
  });
});

describe('the map screen with a conversation kept', () => {
  it('names the question in the chip only: the input says "무엇이든 물어보세요", with no "새 대화"', async () => {
    await closedAfterAsking();

    expect(screen.getByRole('button', { name: `이어서, ${SHUTTLE}` })).toBeVisible();
    expect(within(screen.getByTestId('past-chats')).getByText(`이어서 · ${SHUTTLE}`)).toBeVisible();
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', MAP_PLACEHOLDER);
    expect(screen.queryByRole('button', { name: '새 대화' })).toBeNull();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();
  });

  it('brings the answer back at a press on the chip', async () => {
    const user = await closedAfterAsking();

    await user.press(screen.getByRole('button', { name: CONTINUE }));

    expect(pill().getByText(SHUTTLE)).toBeVisible();
    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(screen.queryByTestId('past-chats')).toBeNull();
  });
});

describe('a message from the main map', () => {
  it('starts a new conversation, which sends none of the old one, and lists the old one among the earlier ones', async () => {
    const user = await closedAfterAsking();

    await ask(user, '배고파', text('어디서 먹을까요?'));

    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual(
      expect.objectContaining({ messages: [{ role: 'user', text: '배고파' }] }),
    );
    expect(pill().getByText('배고파')).toBeVisible();
    await user.press(screen.getByTestId('answer-pill'));
    expect(list().getAllByTestId('question-row')).toHaveLength(2);
    expect(list().getByRole('button', { name: /셔틀 어디 있어\?/u })).toBeVisible();
  });
});

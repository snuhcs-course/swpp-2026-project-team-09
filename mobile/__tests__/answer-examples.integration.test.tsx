/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// What the empty chat offered, above the bar of the answer frame (P02 ticket 04), against the fake main server.

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

const REPLY = '오늘 학생회관식당 점심은 제육볶음이에요.';
// The request context with the User's position, no reason it is missing, and nothing of an answer on screen yet.
const CONTEXT = {
  location: ON_CAMPUS,
  locationMissing: null,
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text: REPLY, mapButtons: [], cards: [], proposal: null },
    afterMs: 1000,
  });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function ask(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(1000);
}

function pill(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-caption'));
}

function sentBodies(): unknown[] {
  return server.received('POST /assistant/messages').map(({ body }) => body);
}

// The examples, by their words (P02 ticket 36).
const EXAMPLES = ['배고파', '오늘 볼 만한 거 있어?', '공부할 자리'];

// Partitions: the keyboard down and up with nothing asked; something asked; an example pressed.
describe('the examples above the bar (P02 ticket 04)', () => {
  it('are offered above the bar while the keyboard is up and nothing is asked', async () => {
    await openMain();

    await showKeyboard(KEYBOARD);

    for (const words of EXAMPLES) {
      expect(screen.getByRole('button', { name: words })).toBeVisible();
    }
  });

  it('are not offered while the keyboard is down', async () => {
    await openMain();

    for (const words of EXAMPLES) {
      expect(screen.queryByRole('button', { name: words })).toBeNull();
    }
  });

  it('are offered no more once something is asked', async () => {
    const user = await openMain();
    await showKeyboard(KEYBOARD);

    await ask(user, '한식');

    expect(screen.queryByRole('button', { name: EXAMPLES[0] })).toBeNull();
  });

  it('send the example pressed, with the request context, and the pill says it', async () => {
    const user = await openMain();
    await showKeyboard(KEYBOARD);

    await user.press(screen.getByRole('button', { name: '오늘 볼 만한 거 있어?' }));
    await pass(1000);

    expect(pill().getByText('오늘 볼 만한 거 있어?')).toBeVisible();
    expect(sentBodies()).toEqual([
      expect.objectContaining({ messages: [{ role: 'user', text: '오늘 볼 만한 거 있어?' }], context: CONTEXT }),
    ]);
  });
});

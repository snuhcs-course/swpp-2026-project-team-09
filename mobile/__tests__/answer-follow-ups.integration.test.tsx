/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer } from './support/server';

// P02 ticket 36 against the fake main server: the follow-ups of the reply on screen, each sending its words. Since P04
// ticket 04 they are words to type, so they show only while the keyboard is up.

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

// The morning of the meal answer's day, a lunch with 김민수.
const MORNING = new Date('2026-11-17T09:00:00+09:00');
const NEXT = '김민수랑 오늘 저녁 먹자';
const TEXT_REPLY = { text: '안녕하세요.', mapButtons: [], cards: [], proposal: null };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: MORNING });
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

async function asked(body: object): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body, afterMs: 500 });
  const user = await openMain();
  await user.type(screen.getByLabelText(AI_INPUT), '배고파, 민수랑 같이');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

function followUps(): ReturnType<typeof within> {
  return within(screen.getByTestId('follow-ups'));
}

function lastSent(): unknown {
  return server.received('POST /assistant/messages').at(-1)?.body;
}

// Partitions: at rest and while typing; a meal's Plan with a Friend; words alone.
describe('the follow-ups of the reply', () => {
  it('are not on the resting screen', async () => {
    await asked(MEAL_ANSWER_REPLY);

    expect(screen.queryByTestId('follow-ups')).toBeNull();
  });

  it("offer the next meals with the Plan's Friend while typing, and send the one pressed as the User's message", async () => {
    const user = await asked(MEAL_ANSWER_REPLY);
    await showKeyboard(KEYBOARD);

    expect(followUps().getAllByRole('button')).toHaveLength(2);
    expect(followUps().getByRole('button', { name: '김민수랑 내일 점심 먹자' })).toBeVisible();
    await user.press(followUps().getByRole('button', { name: NEXT }));

    expect(within(screen.getByTestId('answer-pill')).getByText(NEXT)).toBeVisible();
    expect(JSON.stringify(lastSent())).toContain(JSON.stringify({ role: 'user', text: NEXT }));
  });

  it('are not offered while the next reply is on its way, nor under words alone', async () => {
    const user = await asked(MEAL_ANSWER_REPLY);
    await showKeyboard(KEYBOARD);
    server.on('POST /assistant/messages', { status: 200, body: TEXT_REPLY, afterMs: 500 });

    await user.press(followUps().getByRole('button', { name: NEXT }));
    expect(screen.queryByTestId('follow-ups')).toBeNull();
    await pass(500);

    expect(screen.getByText('안녕하세요.')).toBeVisible();
    expect(screen.queryByTestId('follow-ups')).toBeNull();
  });
});

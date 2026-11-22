/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { Friend } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, SEND } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { MIN_SU } from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, PHONE_NOW } from './support/server';

// The "@" mention of a Friend in the AI input, against the fake main server: "@" lists the User's Friends over the
// input, the words after it narrow them by name with the department telling two 김민수 apart, and a press puts the
// Friend in, whose id the message's request carries.

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

// A second 김민수, of another department.
const OTHER_MIN_SU: Friend = { ...MIN_SU, id: '7b1f0a52-2c8e-4c1e-9d55-0f3f2b7f8e11', department: '경영학과' };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /friends', { status: 200, body: [JI_WOO, MIN_SU, OTHER_MIN_SU] });
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text: '좋아요.', mapButtons: [], cards: [], proposal: null },
  });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function list(): ReturnType<typeof within> {
  return within(screen.getByTestId('mention-list'));
}

describe('the "@" mention of a Friend in the AI input', () => {
  it('lists the Friends on "@", narrows them by name with their departments, and sends the one chosen by id', async () => {
    const user = await openMain();
    const input = screen.getByLabelText(AI_INPUT);

    expect(screen.queryByTestId('mention-list')).toBeNull();
    await user.type(input, '@', { skipBlur: true });
    await pass(100);

    expect(list().getAllByRole('button')).toHaveLength(3);

    await user.type(input, '민수', { skipBlur: true });
    await pass(100);

    expect(list().getByLabelText('김민수, 컴퓨터공학부, 언급')).toBeOnTheScreen();
    expect(list().getByLabelText('김민수, 경영학과, 언급')).toBeOnTheScreen();
    expect(list().queryByLabelText('서지우, 심리학과, 언급')).toBeNull();

    await user.press(list().getByLabelText('김민수, 경영학과, 언급'));
    await pass(100);

    expect(screen.queryByTestId('mention-list')).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toHaveTextContent('@김민수');

    await user.press(screen.getByRole('button', { name: SEND }));
    await pass(500);

    const [sent] = server.received('POST /assistant/messages');
    expect(sent?.body).toMatchObject({
      context: { mentions: [{ userId: OTHER_MIN_SU.id, name: '김민수' }] },
      messages: [{ role: 'user', text: '@김민수' }],
    });
  });

  it('sends no mentions field for a message without one', async () => {
    const user = await openMain();

    await user.type(screen.getByLabelText(AI_INPUT), '배고파');
    await user.press(screen.getByRole('button', { name: SEND }));
    await pass(500);

    const [sent] = server.received('POST /assistant/messages');
    expect(sent?.body).not.toHaveProperty('context.mentions');
  });
});

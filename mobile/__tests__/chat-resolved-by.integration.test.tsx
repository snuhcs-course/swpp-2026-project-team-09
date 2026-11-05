/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { ResolvedBy } from '@/api/assistant-types';
import { REJECTION_FAILED, REJECTION_THANKS } from '@/screens/main/chat-resolved-by';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// The words an answer read through an alias, a line for each under it with 아니에요, against the fake main server.

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

const ASKED = '학관에서 민준이랑 점심';
const REPLY = '학생회관에서 김민준님과 점심이에요.';
const STUDENT_UNION: ResolvedBy = {
  kind: 'place',
  words: '학관',
  id: '0b6f2a10-0000-4c00-8000-000000000063',
  label: '학생회관',
  source: 'personal',
};
const FRIEND: ResolvedBy = { kind: 'friend', words: '민준', id: MIN_JUN.id, label: MIN_JUN.name, source: 'personal' };
const REJECT = '학관 → 학생회관 아니에요';

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

// Opens the chat, asks, and lets the Assistant answer with this body.
async function asked(body: object): Promise<User> {
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text: REPLY, mapButtons: [], cards: [], proposal: null, choices: [], ...body },
  });
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await user.type(screen.getByLabelText(AI_INPUT), ASKED);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

// The words of the lines anywhere in the chat.
function lines(): string[] {
  return screen.queryAllByText(/찾았어요$/u).map((line) => String(line.props.children));
}

describe('the lines under an answer', () => {
  it('shows a line for each reading, with 아니에요', async () => {
    await asked({ resolvedBy: [STUDENT_UNION, FRIEND] });

    const bubble = within(screen.getByTestId('assistant-bubble'));
    expect(bubble.getByText(REPLY)).toBeVisible();
    expect(lines()).toEqual(['학관 → 학생회관으로 찾았어요', '민준 → 김민준으로 찾았어요']);
    expect(bubble.getByRole('button', { name: REJECT })).toBeVisible();
    expect(bubble.getByRole('button', { name: '민준 → 김민준 아니에요' })).toBeVisible();
  });

  it.each([
    ['no readings', { resolvedBy: [] }],
    ['a main server from before aliases', {}],
  ])('shows none for an answer with %s', async (_name, body) => {
    await asked(body);

    expect(screen.getByTestId('assistant-bubble')).toHaveTextContent(REPLY);
    expect(lines()).toEqual([]);
  });
});

describe('아니에요', () => {
  it('sends the reading back, thanks the User and takes that line away', async () => {
    server.on('POST /assistant/aliases/reject', { status: 204 });
    const user = await asked({ resolvedBy: [STUDENT_UNION, FRIEND] });

    await user.press(screen.getByRole('button', { name: REJECT }));
    await pass(100);

    expect(server.received('POST /assistant/aliases/reject').map(({ body }) => body)).toEqual([
      { kind: 'place', words: '학관', targetId: STUDENT_UNION.id },
    ]);
    expect(screen.getByText(REJECTION_THANKS)).toBeVisible();
    expect(lines()).toEqual(['민준 → 김민준으로 찾았어요']);
  });

  it('keeps the line away once the chat is closed and opened again', async () => {
    server.on('POST /assistant/aliases/reject', { status: 204 });
    const user = await asked({ resolvedBy: [STUDENT_UNION] });
    await user.press(screen.getByRole('button', { name: REJECT }));
    await pass(100);

    await user.press(screen.getByRole('button', { name: '대화 닫기' }));
    await user.press(screen.getByLabelText(AI_INPUT));

    expect(screen.getByTestId('assistant-bubble')).toHaveTextContent(REPLY);
    expect(lines()).toEqual([]);
  });

  it('leaves the line and says so when the main server does not take it', async () => {
    server.on('POST /assistant/aliases/reject', refusal(500));
    const user = await asked({ resolvedBy: [STUDENT_UNION] });

    await user.press(screen.getByRole('button', { name: REJECT }));
    await pass(100);

    expect(screen.getByText(REJECTION_FAILED)).toBeVisible();
    expect(lines()).toEqual(['학관 → 학생회관으로 찾았어요']);
    expect(screen.getByRole('button', { name: REJECT })).toBeEnabled();
  });
});

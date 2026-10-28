/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { Choice } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// The candidates under the Assistant's question, as chips, against the fake main server.

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
const QUESTION = '어느 학관이고 어느 민준인가요?';
const REPLY = '알겠어요.';
const STUDENT_UNION: Choice = {
  kind: 'place',
  id: '0b6f2a10-0000-4c00-8000-000000000063',
  label: '학생회관',
  words: '학관',
};
const CHOICES: Choice[] = [
  STUDENT_UNION,
  { kind: 'place', id: '0b6f2a10-0000-4c00-8000-000000000919', label: '(관악사)학부 생활관', words: '학관' },
  { kind: 'friend', id: MIN_JUN.id, label: MIN_JUN.name, words: '민준' },
  { kind: 'place', id: '0b6f2a10-0000-4c00-8000-000000000300', label: '유회진 학술정보관', words: '학관' },
  { kind: 'friend', id: '6d1c3f5e-3333-4a5b-8c9d-000000000003', label: '이민준', words: '민준' },
];

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

function answerWith(body: object): void {
  server.on('POST /assistant/messages', { status: 200, body: { mapButtons: [], cards: [], proposal: null, ...body } });
}

async function say(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

// Opens the chat, asks and lets the Assistant answer with the question and its candidates.
async function asked(): Promise<User> {
  answerWith({ text: QUESTION, choices: CHOICES });
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await say(user, ASKED);
  answerWith({ text: REPLY, choices: [] });
  return user;
}

// The rows of chips anywhere in the chat.
function chipRows(): unknown[] {
  return screen.queryAllByTestId(/^choices-/u);
}

describe('the candidates of an answer', () => {
  it('shows each as a chip under the answer that asks, the candidates of one kind on a row', async () => {
    await asked();

    const bubble = within(screen.getByTestId('assistant-bubble'));
    expect(bubble.getByText(QUESTION)).toBeVisible();
    const row = (kind: string): string[] =>
      within(bubble.getByTestId(`choices-${kind}`))
        .getAllByRole('button')
        .map((chip) => String(chip.props.accessibilityLabel));
    expect(row('place')).toEqual(['학생회관', '(관악사)학부 생활관', '유회진 학술정보관']);
    expect(row('friend')).toEqual(['김민준', '이민준']);
  });

  it('draws none under an answer of a main server that sends no candidates', async () => {
    server.on('POST /assistant/messages', {
      status: 200,
      body: { text: REPLY, mapButtons: [], cards: [], proposal: null },
    });
    const user = await openMain();
    await user.press(screen.getByLabelText(AI_INPUT));

    await say(user, ASKED);

    expect(screen.getByTestId('assistant-bubble')).toHaveTextContent(REPLY);
    expect(chipRows()).toEqual([]);
  });
});

describe('what the chips send, and when they leave', () => {
  it("sends a chip's label as the User's message, with the candidate it chose", async () => {
    const user = await asked();

    await user.press(screen.getByRole('button', { name: '학생회관' }));

    expect(screen.getAllByTestId('user-bubble').at(-1)).toHaveTextContent('학생회관');
    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual({
      messages: [
        { role: 'user', text: ASKED },
        { role: 'assistant', text: QUESTION, cards: [] },
        { role: 'user', text: '학생회관', chosen: { kind: 'place', id: STUDENT_UNION.id, words: '학관' } },
      ],
    });
  });

  it('takes the chips away once a chip is pressed', async () => {
    const user = await asked();

    await user.press(screen.getByRole('button', { name: '학생회관' }));

    expect(chipRows()).toEqual([]);
    await pass(500);
    expect(screen.getAllByTestId('assistant-bubble').at(-1)).toHaveTextContent(REPLY);
    expect(chipRows()).toEqual([]);
  });

  it('takes the chips away once the User writes a message instead', async () => {
    const user = await asked();

    await say(user, '그냥 아무 데나');

    expect(chipRows()).toEqual([]);
    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual({
      messages: [
        { role: 'user', text: ASKED },
        { role: 'assistant', text: QUESTION, cards: [] },
        { role: 'user', text: '그냥 아무 데나' },
      ],
    });
  });
});

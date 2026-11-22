/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { answerShuttle } from './support/shuttle';

// P04 ticket 49, against the fake main server: the list of questions is in two groups, "지금 대화" and "이전 대화"; the
// second's "모두 지우기" asks in its own row and erases the kept conversations only. The current conversation stays,
// with what "이어서 말하기" goes on from.

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

const OLD = '셔틀 어디 있어?';
const NEW = '정문 셔틀은?';
const NEXT = '고마워';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerShuttle(server);
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text: '셔틀이 와요.', mapButtons: [], cards: [], proposal: null },
    afterMs: 500,
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
  await pass(500);
}

function list(): ReturnType<typeof within> {
  return within(screen.getByTestId('question-list'));
}

// One question in an earlier conversation, one in the current one, and the list open from the caption.
async function twoConversations(): Promise<User> {
  const user = await openMain();
  await ask(user, OLD);
  await user.press(screen.getByRole('button', { name: '뒤로' }));
  await ask(user, NEW);
  await user.press(screen.getByTestId('answer-caption'));
  return user;
}

const rowsAsked = (): string[] =>
  list()
    .getAllByTestId('question-row')
    .map((row) => String(row.props.accessibilityLabel));

// Partitions: two groups; 모두 지우기 then 취소; then 지우기; a message after it; one conversation alone.
describe('the earlier conversations in the list of questions', () => {
  it('lists the current conversation first, then the earlier one under "모두 지우기"', async () => {
    await twoConversations();

    expect(list().getByText('지금 대화')).toBeVisible();
    expect(list().getByText('이전 대화')).toBeVisible();
    expect(list().getByRole('button', { name: '새 질문' })).toBeVisible();
    expect(rowsAsked().map((label) => label.includes(NEW))).toEqual([true, false]);
  });

  it('asks in the row before erasing, and 취소 keeps everything', async () => {
    const user = await twoConversations();

    await user.press(list().getByRole('button', { name: '모두 지우기' }));

    expect(list().getByText('이전 대화의 질문 1개를 지울까요?')).toBeVisible();
    await user.press(list().getByRole('button', { name: '취소' }));
    expect(list().getByRole('button', { name: '모두 지우기' })).toBeVisible();
    expect(rowsAsked()).toHaveLength(2);
  });

  it('erases the earlier conversations only, and the next message goes on from the current one', async () => {
    const user = await twoConversations();

    await user.press(list().getByRole('button', { name: '모두 지우기' }));
    await user.press(list().getByRole('button', { name: '지우기' }));

    expect(rowsAsked()).toHaveLength(1);
    expect(rowsAsked()[0]).toContain(NEW);
    expect(list().queryByText('이전 대화')).toBeNull();
    expect(list().queryByText('지금 대화')).toBeNull();
    await user.press(screen.getByTestId('answer-caption'));
    await ask(user, NEXT);
    const messages: unknown = expect.arrayContaining([
      { role: 'user', text: NEW },
      { role: 'user', text: NEXT },
    ]);
    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual(expect.objectContaining({ messages }));
  });
});

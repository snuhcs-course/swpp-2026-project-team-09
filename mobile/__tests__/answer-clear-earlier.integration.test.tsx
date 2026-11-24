/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
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

// P04 ticket 49, against the fake main server: the list of questions is in two groups. "지금 대화" lists the current
// conversation's questions, the one on screen tinted. "이전 대화" lists each kept conversation as one row, whose trash
// erases it at once; its "모두 지우기" asks in the app's dialog. The current conversation stays, with what "이어서
// 말하기" goes on from.

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

const FIRST = '셔틀 어디 있어?';
const SECOND = '정문 셔틀은?';
const OTHER = '학관 셔틀은?';
const NOW = '자연대 셔틀은?';
const NEXT = '고마워';
const REPLY = '셔틀이 와요.';
// PHONE_NOW, 04:00 UTC, in Korea.
const AT = '13:00';

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
    body: { text: REPLY, mapButtons: [], cards: [], proposal: null },
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

// Two kept conversations, of two questions and of one, and the current one of one question, with the list open.
async function threeConversations(): Promise<User> {
  const user = await openMain();
  await ask(user, FIRST);
  await ask(user, SECOND);
  await user.press(screen.getByRole('button', { name: '답 닫기' }));
  await ask(user, OTHER);
  await user.press(screen.getByRole('button', { name: '답 닫기' }));
  await ask(user, NOW);
  await user.press(screen.getByTestId('answer-caption'));
  return user;
}

const rowNames = (): string[] =>
  list()
    .getAllByTestId('question-row')
    .map((row) => String(row.props.accessibilityLabel));

const CURRENT = `${AT}, ${NOW}, ${REPLY}, 지금`;
const ONE = `${AT}, ${OTHER}, ${REPLY}`;
const TWO = `${AT}, ${FIRST}, 질문 2개 · ${REPLY}`;
const DIALOG = '이전 대화를 모두 지울까요?';

// Partitions: the two groups and the tinted row; a kept conversation of two questions taken up; one trashed; 모두
// 지우기 cancelled and confirmed, and a message after it.
describe('the earlier conversations in the list of questions', () => {
  it('lists the current questions, the one on screen tinted, then each kept conversation as one row', async () => {
    await threeConversations();

    expect(list().getByText('지금 대화')).toBeVisible();
    expect(list().getByText('이전 대화')).toBeVisible();
    expect(list().queryByRole('button', { name: '새 대화' })).toBeNull();
    expect(list().queryByText('지금')).toBeNull();
    expect(list().getByRole('button', { name: CURRENT })).toBeSelected();
    expect(rowNames()).toEqual([CURRENT, ONE, TWO]);
  });

  it('takes a kept conversation up again at its last question, whose questions then stand under 지금 대화', async () => {
    const user = await threeConversations();

    await user.press(list().getByRole('button', { name: TWO }));

    expect(within(screen.getByTestId('answer-caption')).getByText(SECOND)).toBeVisible();
    await user.press(screen.getByTestId('answer-caption'));
    expect(rowNames().slice(0, 2)).toEqual([`${AT}, ${SECOND}, ${REPLY}, 지금`, `${AT}, ${FIRST}, ${REPLY}`]);
  });

  it('erases one kept conversation at once with its trash, the others staying', async () => {
    const user = await threeConversations();

    const [trash] = list().getAllByRole('button', { name: '이 대화 지우기' });
    if (trash === undefined) {
      throw new Error('No trash');
    }
    await user.press(trash);

    expect(screen.queryByRole('header', { name: DIALOG })).toBeNull();
    expect(rowNames()).toEqual([CURRENT, TWO]);
  });
});

describe('"모두 지우기"', () => {
  it("asks in the app's dialog, and 취소 keeps everything", async () => {
    const user = await threeConversations();

    await user.press(list().getByRole('button', { name: '모두 지우기' }));

    expect(screen.getByRole('header', { name: DIALOG })).toBeVisible();
    expect(screen.getByText('지금 대화는 그대로 남아요.')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '취소' }));
    await pass(300);
    expect(screen.queryByRole('header', { name: DIALOG })).toBeNull();
    expect(rowNames()).toEqual([CURRENT, ONE, TWO]);
  });

  it('erases the kept conversations only, and the next message goes on from the current one', async () => {
    const user = await threeConversations();
    await user.press(list().getByRole('button', { name: '모두 지우기' }));

    await user.press(screen.getByRole('button', { name: '지우기' }));
    await pass(300);

    expect(rowNames()).toEqual([CURRENT]);
    expect(list().queryByText('이전 대화')).toBeNull();
    expect(list().queryByText('지금 대화')).toBeNull();
    await user.press(screen.getByTestId('answer-caption'));
    await ask(user, NEXT);
    const messages: unknown = expect.arrayContaining([
      { role: 'user', text: NOW },
      { role: 'user', text: NEXT },
    ]);
    const notKept: unknown = expect.not.arrayContaining([{ role: 'user', text: FIRST }]);
    const body = server.received('POST /assistant/messages').at(-1)?.body;
    expect(body).toEqual(expect.objectContaining({ messages }));
    expect(body).toEqual(expect.objectContaining({ messages: notKept }));
  });
});

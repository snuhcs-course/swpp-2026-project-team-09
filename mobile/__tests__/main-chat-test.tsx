/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The chat with the Assistant, the `MainChat` frame, against the fake main server.

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

const GREETING = '무엇을 도와드릴까요?';
const NOTICE = '대화 내용은 AI 제공자에게 전송돼요';
const REPLY = '오늘 학생회관식당 점심은 제육볶음이에요.';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /assistant/messages', { status: 200, body: { text: REPLY }, afterMs: 1000 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function openChat(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  return user;
}

function sendButton(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name: '보내기' });
}

describe('the chat with the Assistant', () => {
  it('opens as a sheet over the map when the input bar is pressed, with the tabs still in view', async () => {
    await openMain();
    expect(screen.queryByTestId('chat-sheet')).toBeNull();

    await openChat();

    expect(screen.getByTestId('chat-sheet')).toBeVisible();
    expect(screen.getByRole('header', { name: 'SNU Now AI' })).toBeVisible();
    expect(screen.getByRole('tab', { name: '행사' })).toBeVisible();
  });

  it('shows the greeting, where the conversation goes, and the three examples while it is empty', async () => {
    await openChat();

    expect(screen.getByRole('header', { name: GREETING })).toBeVisible();
    expect(screen.getByText(NOTICE)).toBeVisible();
    for (const example of ['식사 메뉴 추천', '현재 통학/순환 셔틀 위치', '파티 찾기']) {
      expect(screen.getByRole('button', { name: example })).toBeVisible();
    }
  });

  it('keeps the input bar at the bottom as its input, and hides the controls above it', async () => {
    await openChat();

    expect(screen.getByTestId('ai-input')).toBeVisible();
    expect(screen.queryByRole('button', { name: /^오늘의 발자국/u })).toBeNull();
    expect(screen.queryByRole('button', { name: '편의기능 (식당 · 셔틀버스)' })).toBeNull();
  });

  it('closes with its close button', async () => {
    const user = await openChat();

    await user.press(screen.getByRole('button', { name: '대화 닫기' }));

    expect(screen.queryByTestId('chat-sheet')).toBeNull();
  });

  it("sends an example's words as the User's message", async () => {
    const user = await openChat();

    await user.press(screen.getByRole('button', { name: '식사 메뉴 추천' }));

    expect(server.received('POST /assistant/messages').map(({ body }) => body)).toEqual([
      { messages: [{ role: 'user', text: '식사 메뉴 추천' }] },
    ]);
    expect(screen.queryByText(GREETING)).toBeNull();
  });
});

describe("the chat's input and bubbles", () => {
  it('keeps the send button disabled while the input is empty', async () => {
    const user = await openChat();
    expect(sendButton()).toBeDisabled();

    await user.type(screen.getByLabelText(AI_INPUT), '   ');

    expect(sendButton()).toBeDisabled();
  });

  it('shows "···" while the Assistant works, then its reply at the left of the User\'s message', async () => {
    const user = await openChat();

    await user.type(screen.getByLabelText(AI_INPUT), '오늘 점심 뭐 나와?');
    await user.press(sendButton());

    expect(screen.getByTestId('user-bubble')).toHaveTextContent('오늘 점심 뭐 나와?');
    expect(screen.getByTestId('waiting-bubble')).toHaveTextContent('···');
    expect(screen.getByLabelText(AI_INPUT)).toHaveDisplayValue('');

    await pass(1000);

    expect(screen.queryByTestId('waiting-bubble')).toBeNull();
    expect(screen.getByTestId('assistant-bubble')).toHaveTextContent(REPLY);
    expect(screen.getByTestId('user-bubble')).toHaveStyle({ alignSelf: 'flex-end' });
    expect(screen.getByTestId('assistant-bubble')).toHaveStyle({ alignSelf: 'flex-start' });
  });

  it('sends the conversation so far with the next message', async () => {
    const user = await openChat();
    await user.press(screen.getByRole('button', { name: '식사 메뉴 추천' }));
    await pass(1000);

    await user.type(screen.getByLabelText(AI_INPUT), '한식');
    await user.press(sendButton());

    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual({
      messages: [
        { role: 'user', text: '식사 메뉴 추천' },
        { role: 'assistant', text: REPLY },
        { role: 'user', text: '한식' },
      ],
    });
  });
});

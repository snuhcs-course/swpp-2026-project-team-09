/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { hideKeyboard, KEYBOARD, quietDismiss, showKeyboard } from './support/keyboard';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// Who takes a touch in the chat's conversation. On Android a view that is the JS responder takes every later move of
// the touch from the views inside it (`JSResponderHandler.onInterceptTouchEvent`), so a responder around the
// conversation's scroll view keeps it from scrolling. With the keyboard down the scroll view does not take a touch
// itself, so whatever takes it must be the scroll view or inside it.

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
const ANSWERED = { status: 200, body: { text: REPLY, mapButtons: [], cards: [], proposal: null } };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /assistant/messages', { ...ANSWERED, afterMs: 1000 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;
type Host = ReturnType<typeof screen.getByTestId>;

// Opens the chat and lets the Assistant answer a message, the keyboard up while it is written.
async function answered(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await showKeyboard(KEYBOARD);
  await user.type(screen.getByLabelText(AI_INPUT), '오늘 점심 뭐 나와?');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(1000);
  return user;
}

// The host views from the root down to `target`.
function pathTo(target: Host): Host[] {
  const path: Host[] = [];
  for (let node: Host | null = target; node !== null; node = node.parent) {
    if (typeof node.type === 'string') {
      path.unshift(node);
    }
  }
  return path;
}

// A view's `onStartShouldSetResponder` or its capture.
function isClaim(handler: unknown): handler is (event: object) => boolean {
  return typeof handler === 'function';
}

// The view that becomes the JS responder for a touch starting on `target`, as React Native's responder system finds
// it: the capture phase from the root down, then the bubbling phase back up.
function responderFor(target: Host): Host | null {
  const path = pathTo(target);
  const event = { target, nativeEvent: { target, touches: [], changedTouches: [] }, persist: (): void => undefined };
  const claims = (node: Host, phase: string): boolean => {
    const handler: unknown = node.props[phase];
    return isClaim(handler) && handler({ ...event, currentTarget: node });
  };
  return (
    path.find((node) => claims(node, 'onStartShouldSetResponderCapture')) ??
    path.toReversed().find((node) => claims(node, 'onStartShouldSetResponder')) ??
    null
  );
}

describe("the chat's conversation and touches", () => {
  it('leaves a touch on a bubble with the keyboard down to the scroll view or what is inside it', async () => {
    await answered();
    await hideKeyboard();

    const conversation = screen.getByTestId('chat-bubbles');
    const responder = responderFor(screen.getByText(REPLY));

    expect(responder?.props.testID).not.toBe('chat-sheet');
    expect(responder !== null && pathTo(responder).includes(conversation)).toBe(true);
  });

  it('puts the keyboard down with a press on a bubble that nothing in it takes', async () => {
    const dismiss = quietDismiss();
    const user = await answered();

    await user.press(screen.getByText(REPLY));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('chat-sheet')).toBeVisible();
  });

  it('puts the keyboard down with a press on the header that neither of its buttons takes', async () => {
    const dismiss = quietDismiss();
    const user = await answered();

    await user.press(screen.getByRole('header', { name: 'SNU Now AI' }));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('chat-sheet')).toBeVisible();
  });
});

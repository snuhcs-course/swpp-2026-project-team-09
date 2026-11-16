/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { quietDismiss } from './support/keyboard';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The conversation with the Assistant from the map's bar, which the answer frame shows, against the fake main server.

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
// The Assistant's answer, with nothing beside its text.
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

function sendButton(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name: '보내기' });
}

// Writes the message in the map's bar and sends it, and lets the Assistant answer.
async function say(user: User, text: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), text);
  await user.press(sendButton());
  await pass(1000);
}

describe('the frame and the keyboard', () => {
  it('puts the keyboard down when the frame is closed with ✕', async () => {
    const user = await openMain();
    await say(user, '오늘 점심 뭐 나와?');
    const dismiss = quietDismiss();

    await user.press(within(screen.getByTestId('answer-pill')).getByRole('button', { name: '답 닫기' }));

    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});

describe("the bar's input", () => {
  it('keeps the send button disabled while the input is empty', async () => {
    const user = await openMain();
    expect(sendButton()).toBeDisabled();

    await user.type(screen.getByLabelText(AI_INPUT), '   ');

    expect(sendButton()).toBeDisabled();
  });
});

describe('what the conversation sends', () => {
  it('sends only the latest 20 messages', async () => {
    const user = await openMain();
    for (let sent = 1; sent <= 11; sent += 1) {
      // oxlint-disable-next-line no-await-in-loop -- each message waits for the reply to the one before
      await say(user, `질문 ${sent}`);
    }

    // Of 21 messages, the first is dropped.
    const latest = Array.from({ length: 10 }, (_, index) => [
      { role: 'assistant', text: REPLY, cards: [] },
      { role: 'user', text: `질문 ${index + 2}` },
    ]).flat();
    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual(
      expect.objectContaining({ messages: latest }),
    );
  });

  it('keeps the User from writing more than a message takes', async () => {
    await openMain();

    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('maxLength', 1000);
  });
});

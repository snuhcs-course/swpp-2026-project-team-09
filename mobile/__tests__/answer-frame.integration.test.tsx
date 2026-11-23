/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { holdBackButton } from './support/back';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT, FRIEND_PILL, FULL_SCREEN, LAYERS } from './support/lists';
import { givePhone, OFF_CAMPUS, ON_CAMPUS, openMain } from './support/main';
import { DINNER, press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';
import { CONTINUE } from './support/questions';

// The answer frame (P02 tickets 01 and 04) against the fake main server: one card at the bottom holds the reply, under a
// small caption of what the User asked, and its ✕ closes it (rule 5 of the 2026-11-22 redesign, P04 ticket 52).

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

const ASKED = '배고파, 민수랑 같이';
const REPLY = '오늘 학생회관식당 점심은 제육볶음이에요.';
const ANSWERED = { status: 200, body: { text: REPLY, mapButtons: [], cards: [], proposal: null } };
const FAILED = '답을 가져오지 못했어요.';
const WAITING = '보는 중';
const CLOSE = '답 닫기';
const NOTICE = '대화 내용은 AI 제공자에게 전송돼요';
// The request context of this ticket: the User's position, no reason it is missing, and nothing of an answer on screen
// yet.
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
  server.on('POST /assistant/messages', { ...ANSWERED, afterMs: 1000 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Writes the words in the bar and sends them, without waiting for the reply.
async function send(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
}

async function ask(user: User, words: string = ASKED): Promise<void> {
  await send(user, words);
  await pass(1000);
}

function caption(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-caption'));
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function sentBodies(): unknown[] {
  return server.received('POST /assistant/messages').map(({ body }) => body);
}

// What gives way to the frame, by what a screen reader says of it.
const GIVING_WAY = [FRIEND_PILL, FULL_SCREEN, LAYERS, '확대'];

// Partitions: the conversation empty, waiting, answered, and failed.
describe('the frame', () => {
  it('shows the words as the caption of the card, waiting with 보는 중, with "＋ 새 대화" and ✕, and no chat sheet', async () => {
    const user = await openMain();

    await send(user, ASKED);

    expect(caption().getByText(ASKED)).toBeVisible();
    expect(card().getByLabelText(WAITING)).toBeVisible();
    // The header's pill and ✕ stand in every state, the waiting card's too (P04 ticket 52).
    expect(card().getByRole('button', { name: '새 대화' })).toBeVisible();
    expect(screen.getByRole('button', { name: CLOSE })).toBeVisible();
    expect(screen.queryByTestId('chat-sheet')).toBeNull();
  });

  it('shows the reply in the card once it comes', async () => {
    const user = await openMain();

    await ask(user);

    expect(card().getByText(REPLY)).toBeVisible();
    expect(card().queryByLabelText(WAITING)).toBeNull();
  });

  it('is not shown before anything is asked', async () => {
    await openMain();

    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(screen.queryByTestId('answer-card')).toBeNull();
  });
});

describe('what gives way to the frame', () => {
  it('hides the lists, the row of buttons, 편의기능, the zoom control, and the tabs', async () => {
    const user = await openMain();

    await ask(user);

    for (const name of GIVING_WAY) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByRole('tab', { name: '행사' })).toBeNull();
  });

  it('brings them back when the frame is hidden', async () => {
    const user = await openMain();
    await ask(user);

    await user.press(screen.getByRole('button', { name: CLOSE }));

    for (const name of GIVING_WAY) {
      expect(screen.getByRole('button', { name })).toBeVisible();
    }
    expect(screen.getByRole('tab', { name: '행사' })).toBeVisible();
  });

  it("opens a marker's card on a press while nothing is asked", async () => {
    const user = await openMain();

    await press(user, DINNER);

    expect(screen.getByTestId('map-card')).toBeVisible();
  });

  it('opens no card on a press on a marker', async () => {
    const user = await openMain();
    await ask(user);

    await press(user, DINNER);

    expect(screen.queryByTestId('map-card')).toBeNull();
    await user.press(screen.getByRole('button', { name: CLOSE }));
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

describe('the request', () => {
  it("carries the User's position, nulls for the rest, and the capabilities that say the app draws answers", async () => {
    const user = await openMain();

    await ask(user);

    expect(sentBodies()).toEqual([
      {
        messages: [{ role: 'user', text: ASKED }],
        context: CONTEXT,
        clientCapabilities: SENT_CAPABILITIES,
      },
    ]);
  });

  it('says no position while the User is off campus, and that they are off campus (P02-13)', async () => {
    givePhone({ permission: 'granted', position: OFF_CAMPUS });
    const user = await openMain();

    await ask(user);

    expect(sentBodies()).toEqual([
      expect.objectContaining({ context: { ...CONTEXT, location: null, locationMissing: 'off-campus' } }),
    ]);
  });

  it('joins a follow-up to the same conversation, and the caption says the new words', async () => {
    const user = await openMain();
    await ask(user);
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', '이어서 말하기');

    await ask(user, '한식');

    expect(caption().getByText('한식')).toBeVisible();
    expect(sentBodies().at(-1)).toEqual({
      messages: [
        { role: 'user', text: ASKED },
        { role: 'assistant', text: REPLY, cards: [] },
        { role: 'user', text: '한식' },
      ],
      context: CONTEXT,
      clientCapabilities: SENT_CAPABILITIES,
    });
  });
});

describe('closing the frame', () => {
  it('hides the frame with ✕, keeping the conversation and a reply on its way, which "이어서" goes on with', async () => {
    const user = await openMain();
    await send(user, ASKED);

    await user.press(screen.getByRole('button', { name: CLOSE }));
    await pass(1000);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    await user.press(screen.getByRole('button', { name: CONTINUE }));
    expect(card().getByText(REPLY)).toBeVisible();
    await ask(user, '한식');
    expect(sentBodies().at(-1)).toEqual(
      expect.objectContaining({
        messages: [
          { role: 'user', text: ASKED },
          { role: 'assistant', text: REPLY, cards: [] },
          { role: 'user', text: '한식' },
        ],
      }),
    );
  });

  it("hides the frame with Android's back button, which goes no further", async () => {
    const back = holdBackButton();
    const user = await openMain();
    await ask(user);
    expect(screen.getByTestId('answer-caption')).toBeVisible();

    const taken = await back();

    expect(taken).toBe(true);
    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(screen.getByRole('button', { name: FRIEND_PILL })).toBeVisible();
  });
});

describe('a failure in the frame', () => {
  it('shows the failure with 다시 시도, which sends the same message with the context again', async () => {
    server.on('POST /assistant/messages', refusal(503));
    const user = await openMain();
    await ask(user);
    expect(card().getByText(FAILED)).toBeVisible();
    server.on('POST /assistant/messages', { ...ANSWERED, afterMs: 1000 });

    await user.press(card().getByRole('button', { name: '다시 시도' }));
    await pass(1000);

    const [first, again] = sentBodies();
    expect(again).toEqual(first);
    expect(again).toEqual(expect.objectContaining({ context: CONTEXT }));
    expect(card().getByText(REPLY)).toBeVisible();
  });
});

describe('the bar and the keyboard', () => {
  it("stands over the keyboard, and the card's caption gives way to the reply's first line, with no questions", async () => {
    const user = await openMain();
    await ask(user);

    await showKeyboard(KEYBOARD);

    // The bar's 12 above the keyboard, which the tests' phone counts from the bottom of the screen.
    expect(screen.getByTestId('ai-input')).toHaveStyle({ bottom: 12 + KEYBOARD });
    // P04 ticket 52: the input's focus opens no questions; the history chip alone does.
    expect(card().queryByTestId('question-list')).toBeNull();
    expect(screen.getByTestId('typing-words')).toHaveTextContent(REPLY);
    expect(screen.queryByTestId('answer-caption')).toBeNull();
  });

  it('says where the conversation goes above the bar while the keyboard is up and nothing is asked', async () => {
    await openMain();

    await showKeyboard(KEYBOARD);

    expect(screen.getByText(NOTICE)).toBeVisible();
  });

  it('says it no more once something is asked', async () => {
    const user = await openMain();
    await showKeyboard(KEYBOARD);

    await ask(user);

    expect(screen.queryByText(NOTICE)).toBeNull();
    expect(screen.getByTestId('answer-card')).toBeVisible();
  });
});

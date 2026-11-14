/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { holdBackButton } from './support/back';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT, FOOTPRINTS, FRIEND_PILL, FULL_SCREEN, LAYERS } from './support/lists';
import { givePhone, OFF_CAMPUS, ON_CAMPUS, openMain } from './support/main';
import { DINNER, press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The answer frame (P02 ticket 01) against the fake main server: with the switch on, what the User asks stays as a
// pill at the top and one card at the bottom holds the reply; with it off, the chat sheet is today's.

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
const FAILED = '지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요';
const WAITING = '보는 중이에요';
const CLOSE = '답 닫기';
const NOTICE = '대화 내용은 AI 제공자에게 전송돼요';
// The request context of this ticket: the User's position, and nothing of an answer on screen yet.
const CONTEXT = { location: ON_CAMPUS, viewport: null, tapped: null, conditions: null, planId: null };

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

function openFramed(): Promise<User> {
  return openMain({ answerOnMap: true });
}

// Writes the words in the bar and sends them, without waiting for the reply.
async function send(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
}

async function ask(user: User, words: string = ASKED): Promise<void> {
  await send(user, words);
  await pass(1000);
}

function pill(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-pill'));
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function sentBodies(): unknown[] {
  return server.received('POST /assistant/messages').map(({ body }) => body);
}

// What gives way to the frame, by what a screen reader says of it.
const GIVING_WAY = [FRIEND_PILL, FULL_SCREEN, FOOTPRINTS, LAYERS, '확대'];

// Partitions: the switch off and on; the conversation empty, waiting, answered, and failed.
describe('the switch off', () => {
  it("opens the chat sheet from the bar, and the request is today's: the messages and the library capability", async () => {
    const user = await openMain();

    await user.press(screen.getByLabelText(AI_INPUT));
    await ask(user);

    expect(screen.getByTestId('chat-sheet')).toBeVisible();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(sentBodies()).toEqual([{ messages: [{ role: 'user', text: ASKED }], clientCapabilities: ['library'] }]);
  });
});

describe('the frame', () => {
  it('shows the pill with the words and the card saying 보는 중이에요, and no chat sheet, until the reply', async () => {
    const user = await openFramed();

    await send(user, ASKED);

    expect(pill().getByText(ASKED)).toBeVisible();
    expect(pill().getByRole('button', { name: CLOSE })).toBeVisible();
    expect(card().getByText(WAITING)).toBeVisible();
    expect(screen.queryByTestId('chat-sheet')).toBeNull();
  });

  it('shows the reply in the card once it comes', async () => {
    const user = await openFramed();

    await ask(user);

    expect(card().getByText(REPLY)).toBeVisible();
    expect(card().queryByText(WAITING)).toBeNull();
  });

  it('is not shown before anything is asked', async () => {
    await openFramed();

    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(screen.queryByTestId('answer-card')).toBeNull();
  });
});

describe('what gives way to the frame', () => {
  it('hides the lists, the row of buttons, 편의기능, the zoom control, and the tabs', async () => {
    const user = await openFramed();

    await ask(user);

    for (const name of GIVING_WAY) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByRole('tab', { name: '행사' })).toBeNull();
  });

  it('brings them back when the frame is closed', async () => {
    const user = await openFramed();
    await ask(user);

    await user.press(pill().getByRole('button', { name: CLOSE }));

    for (const name of GIVING_WAY) {
      expect(screen.getByRole('button', { name })).toBeVisible();
    }
    expect(screen.getByRole('tab', { name: '행사' })).toBeVisible();
  });

  it("opens a marker's card on a press while nothing is asked", async () => {
    const user = await openFramed();

    await press(user, DINNER);

    expect(screen.getByTestId('map-card')).toBeVisible();
  });

  it('opens no card on a press on a marker', async () => {
    const user = await openFramed();
    await ask(user);

    await press(user, DINNER);

    expect(screen.queryByTestId('map-card')).toBeNull();
    await user.press(pill().getByRole('button', { name: CLOSE }));
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

describe('the request with the switch on', () => {
  it("carries the User's position, nulls for the rest, and the capability that says the app draws answers", async () => {
    const user = await openFramed();

    await ask(user);

    expect(sentBodies()).toEqual([
      { messages: [{ role: 'user', text: ASKED }], context: CONTEXT, clientCapabilities: ['library', 'answer'] },
    ]);
  });

  it('says no position while the User is off campus', async () => {
    givePhone({ permission: 'granted', position: OFF_CAMPUS });
    const user = await openFramed();

    await ask(user);

    expect(sentBodies()).toEqual([expect.objectContaining({ context: { ...CONTEXT, location: null } })]);
  });

  it('joins a follow-up to the same conversation, and the pill says the new words', async () => {
    const user = await openFramed();
    await ask(user);
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', '이어서 말하기');

    await ask(user, '한식');

    expect(pill().getByText('한식')).toBeVisible();
    expect(sentBodies().at(-1)).toEqual({
      messages: [
        { role: 'user', text: ASKED },
        { role: 'assistant', text: REPLY, cards: [] },
        { role: 'user', text: '한식' },
      ],
      context: CONTEXT,
      clientCapabilities: ['library', 'answer'],
    });
  });
});

describe('closing the frame', () => {
  it('forgets the conversation with ✕, a reply on its way included', async () => {
    const user = await openFramed();
    await send(user, ASKED);

    await user.press(pill().getByRole('button', { name: CLOSE }));
    await pass(1000);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    await ask(user, '한식');
    expect(sentBodies().at(-1)).toEqual(expect.objectContaining({ messages: [{ role: 'user', text: '한식' }] }));
  });

  it("forgets the conversation with Android's back button, which goes no further", async () => {
    const back = holdBackButton();
    const user = await openFramed();
    await ask(user);
    expect(screen.getByTestId('answer-pill')).toBeVisible();

    const taken = await back();

    expect(taken).toBe(true);
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(screen.getByRole('button', { name: FRIEND_PILL })).toBeVisible();
  });
});

describe('a failure in the frame', () => {
  it('shows the failure with 다시 시도, which sends the same message with the context again', async () => {
    server.on('POST /assistant/messages', refusal(503));
    const user = await openFramed();
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
  it('stands over the keyboard, and the content of the card gives way to it', async () => {
    const user = await openFramed();
    await ask(user);

    await showKeyboard(KEYBOARD);

    // The bar's 12 above the keyboard, which the tests' phone counts from the bottom of the screen.
    expect(screen.getByTestId('ai-input')).toHaveStyle({ bottom: 12 + KEYBOARD });
    expect(screen.queryByText(REPLY)).toBeNull();
  });

  it('says where the conversation goes above the bar while the keyboard is up and nothing is asked', async () => {
    await openFramed();

    await showKeyboard(KEYBOARD);

    expect(screen.getByText(NOTICE)).toBeVisible();
  });

  it('says it no more once something is asked', async () => {
    const user = await openFramed();
    await showKeyboard(KEYBOARD);

    await ask(user);

    expect(screen.queryByText(NOTICE)).toBeNull();
    expect(screen.getByTestId('answer-card')).toBeVisible();
  });
});

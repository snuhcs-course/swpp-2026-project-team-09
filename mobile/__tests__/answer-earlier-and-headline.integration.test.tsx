/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { WAY_LOOKUP_REPLY } from '@/api/mock/data/way-lookup';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { CAREER, MAJOR } from './support/events';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P02 tickets 32 and 35 against the fake main server: the answer card shows the turn on screen first, with its
// question, and "지난 답 N개" under it opens the earlier turns read-only, the latest first; while the keyboard is up
// the card shows the headline of the turn on screen on one line.

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
const REPLY = '셔틀 두 대가 정문과 자연대에 있어요.\n정문 셔틀이 먼저 와요.';
const TEXT_REPLY = { text: REPLY, mapButtons: [], cards: [], proposal: null };
const EVENTS = [MAJOR, CAREER].map((globalEvent) => ({ kind: 'globalEvent', globalEvent }));
const EVENTS_REPLY = { text: '설명회 두 개가 있어요.', mapButtons: [], cards: EVENTS, proposal: null };
const PLAN_LINE = '점심 12:15 302동식당';
const LOOKUP_TITLE = '문화관(73동)은 여기예요';

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

async function send(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
}

// Asks each of `turns` in turn, the main server answering each with its reply.
async function talk(turns: readonly (readonly [string, object])[]): Promise<User> {
  const user = await openMain();
  for (const [words, body] of turns) {
    server.on('POST /assistant/messages', { status: 200, body, afterMs: 500 });
    // One turn after the other, as the User talks.
    // oxlint-disable-next-line no-await-in-loop
    await send(user, words);
    // oxlint-disable-next-line no-await-in-loop
    await pass(500);
  }
  return user;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function earlier(): ReturnType<typeof within>[] {
  return screen.queryAllByTestId('earlier-turn').map((turn) => within(turn));
}

// Partitions: no earlier turn; a Plan's, a Lookup's and a sentence's reply; opened and closed.
describe('the turn on screen', () => {
  it('stands first in the card with its question, and "지난 답 N개" under its reply', async () => {
    await talk([
      [ASKED, MEAL_ANSWER_REPLY],
      ['셔틀 어디 있어?', TEXT_REPLY],
    ]);

    expect(card().getByTestId('turn-question')).toHaveTextContent('셔틀 어디 있어?');
    const drawn = JSON.stringify(screen.toJSON());
    expect(drawn.indexOf('셔틀 어디 있어?')).toBeLessThan(drawn.indexOf('정문 셔틀이 먼저 와요.'));
    expect(drawn.indexOf('정문 셔틀이 먼저 와요.')).toBeLessThan(drawn.indexOf('지난 답 1개'));
  });
});

describe('"지난 답 N개"', () => {
  it('is not shown on the first turn', async () => {
    await talk([[ASKED, MEAL_ANSWER_REPLY]]);

    expect(card().queryByRole('button', { name: /^지난 답/u })).toBeNull();
  });

  it("opens the earlier turns under the turn on screen, the latest first, each the words asked and the reply's lines, without a button", async () => {
    const user = await talk([
      [ASKED, MEAL_ANSWER_REPLY],
      ['문화관이 어디야?', WAY_LOOKUP_REPLY],
      ['셔틀 어디 있어?', TEXT_REPLY],
      ['정문 셔틀은?', TEXT_REPLY],
    ]);
    expect(earlier()).toHaveLength(0);

    await user.press(card().getByRole('button', { name: '지난 답 3개' }));

    const [words, lookup, plan] = earlier();
    expect(plan?.getByText(ASKED)).toBeVisible();
    expect(plan?.getByText(PLAN_LINE)).toBeVisible();
    expect(lookup?.getByText('문화관이 어디야?')).toBeVisible();
    expect(lookup?.getByText(LOOKUP_TITLE)).toBeVisible();
    expect(words?.getByText('셔틀 어디 있어?')).toBeVisible();
    expect(words?.getByText('정문 셔틀이 먼저 와요.')).toBeVisible();
    for (const turn of earlier()) {
      expect(turn.queryAllByRole('button')).toHaveLength(0);
    }
  });

  it('closes them with "접기"', async () => {
    const user = await talk([
      [ASKED, MEAL_ANSWER_REPLY],
      ['셔틀 어디 있어?', TEXT_REPLY],
    ]);
    await user.press(card().getByRole('button', { name: '지난 답 1개' }));
    expect(earlier()).toHaveLength(1);

    await user.press(card().getByRole('button', { name: '접기' }));

    expect(earlier()).toHaveLength(0);
    expect(card().getByRole('button', { name: '지난 답 1개' })).toBeVisible();
  });
});

describe('an earlier turn with cards', () => {
  it('names the cards of an earlier turn', async () => {
    const user = await talk([
      ['설명회 있어?', EVENTS_REPLY],
      ['셔틀 어디 있어?', TEXT_REPLY],
    ]);

    await user.press(card().getByRole('button', { name: '지난 답 1개' }));

    const [events] = earlier();
    expect(events?.getByText(`· ${MAJOR.title}`)).toBeVisible();
    expect(events?.getByText(`· ${CAREER.title}`)).toBeVisible();
  });
});

function headline(): ReturnType<typeof screen.getByTestId> {
  return card().getByTestId('answer-headline');
}

// Partitions: a Plan's, a Lookup's and a sentence's reply; the reply on its way.
describe('the card while the keyboard is up', () => {
  it("shows the Plan's headline on one line in place of the card's content, and leaves the map as it is", async () => {
    await talk([[ASKED, MEAL_ANSWER_REPLY]]);

    await showKeyboard(KEYBOARD);

    expect(headline()).toHaveTextContent(PLAN_LINE);
    expect(headline()).toHaveProp('numberOfLines', 1);
    expect(card().queryByRole('button', { name: '같이 먹을 친구 추가' })).toBeNull();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();
    expect(screen.getByLabelText('302동식당 · 12:15 점심')).toBeOnTheScreen();
  });

  it("shows the Lookup's title", async () => {
    await talk([['문화관이 어디야?', WAY_LOOKUP_REPLY]]);

    await showKeyboard(KEYBOARD);

    expect(headline()).toHaveTextContent(LOOKUP_TITLE);
    expect(card().queryByRole('button', { name: '길 안내' })).toBeNull();
  });

  it("shows the first line of the reply's words", async () => {
    await talk([['셔틀 어디 있어?', TEXT_REPLY]]);

    await showKeyboard(KEYBOARD);

    expect(headline()).toHaveTextContent('셔틀 두 대가 정문과 자연대에 있어요.');
    expect(card().queryByText('정문 셔틀이 먼저 와요.')).toBeNull();
  });

  it('shows the dots while the reply is on its way', async () => {
    server.on('POST /assistant/messages', { status: 200, body: TEXT_REPLY, afterMs: 1000 });
    const user = await openMain();
    await send(user, '셔틀 어디 있어?');

    await showKeyboard(KEYBOARD);

    expect(card().getByLabelText('보는 중')).toBeVisible();
    expect(card().queryByTestId('answer-headline')).toBeNull();
    expect(card().queryByRole('button', { name: '그만' })).toBeNull();
  });
});

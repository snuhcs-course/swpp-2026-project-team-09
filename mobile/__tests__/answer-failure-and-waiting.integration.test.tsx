/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P02 ticket 12 against the fake main server: a request that failed says so in two lines and keeps the words in the
// input (n16), and while the reply is on its way the card shows the dots (보는 중) with 그만, and the input is hidden
// (n18). Since P04 ticket 05 a failure docks as its first line with 다시 시도, and a press on the line raises both.

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

const ASKED = '배고파';
const REPLY = '오늘 학생회관식당 점심은 제육볶음이에요.';
const ANSWERED = { status: 200, body: { text: REPLY, mapButtons: [], cards: [], proposal: null } };
const FAILED_FIRST = '답을 가져오지 못했어요.';
const FAILED_SECOND = '연결이 끊겼거나 서버가 답하지 않았어요. 쓴 말은 입력칸에 그대로 두었어요.';
const USED_UP = '오늘은 여기까지 답할 수 있어요. 내일 다시 물어봐 주세요';

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

function input(): ReturnType<typeof screen.getByLabelText> {
  return screen.getByLabelText(AI_INPUT);
}

async function send(user: User, words: string): Promise<void> {
  await user.type(input(), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
}

async function ask(user: User, words: string = ASKED): Promise<void> {
  await send(user, words);
  await pass(1000);
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function sentBodies(): unknown[] {
  return server.received('POST /assistant/messages').map(({ body }) => body);
}

function sentWith(messages: object[]): unknown {
  return expect.objectContaining({ messages });
}

// The frame, after the words were sent and the request failed.
async function failedInFrame(): Promise<User> {
  server.on('POST /assistant/messages', refusal(503));
  const user = await openMain();
  await ask(user);
  return user;
}

// Partitions: a failure the Assistant may get over, and the daily limit; the words kept, edited, sent again, and dropped
// with the frame.
describe('a request that failed, in the frame (n16)', () => {
  it('says what failed in two lines with 다시 시도, and the input holds the words that were sent', async () => {
    const user = await failedInFrame();

    expect(card().getByText(FAILED_FIRST)).toBeVisible();
    expect(card().getByRole('button', { name: '다시 시도' })).toBeVisible();
    expect(input()).toHaveDisplayValue(ASKED);
    expect(screen.getByRole('button', { name: '보내기' })).toBeEnabled();

    await user.press(card().getByText(FAILED_FIRST));

    expect(card().getByText(FAILED_SECOND)).toBeVisible();
    expect(card().getByRole('button', { name: '다시 시도' })).toBeVisible();
  });

  it('puts the words back again after a second failure', async () => {
    const user = await failedInFrame();

    await user.press(card().getByRole('button', { name: '다시 시도' }));
    await pass(1000);

    expect(card().getByText(FAILED_FIRST)).toBeVisible();
    expect(input()).toHaveDisplayValue(ASKED);
  });

  it('keeps its own words for the daily limit, with no 다시 시도 and nothing put back', async () => {
    server.on('POST /assistant/messages', refusal(429));
    const user = await openMain();

    await ask(user);

    expect(card().getByText(USED_UP)).toBeVisible();
    expect(card().queryByText(FAILED_FIRST)).toBeNull();
    expect(card().queryByRole('button', { name: '다시 시도' })).toBeNull();
    expect(input()).toHaveDisplayValue('');
  });
});

describe('the words kept after a failure, in the frame (n16)', () => {
  it('sends the edited words as the next message, and the failure is left out', async () => {
    const user = await failedInFrame();
    server.on('POST /assistant/messages', ANSWERED);

    await user.clear(input());
    await ask(user, '한식 먹고 싶어');

    expect(sentBodies().at(-1)).toEqual(
      sentWith([
        { role: 'user', text: ASKED },
        { role: 'user', text: '한식 먹고 싶어' },
      ]),
    );
    expect(card().getByText(REPLY)).toBeVisible();
    expect(input()).toHaveDisplayValue('');
  });

  it('sends the same message again with 다시 시도, and the input is empty once the reply comes', async () => {
    const user = await failedInFrame();
    server.on('POST /assistant/messages', { ...ANSWERED, afterMs: 1000 });

    await user.press(card().getByRole('button', { name: '다시 시도' }));
    await pass(1000);

    const asked = sentWith([{ role: 'user', text: ASKED }]);
    expect(sentBodies()).toEqual([asked, asked]);
    expect(card().getByText(REPLY)).toBeVisible();
    expect(input()).toHaveDisplayValue('');
  });
});

// Rule 4 of the 2026-11-22 redesign: what is sent from the main map starts a new conversation, and the one kept goes
// among the earlier ones, whose questions the caption's list holds.
describe('the words kept after a failure, on the main map (n16)', () => {
  it('stay when the frame is hidden with ←, and are sent from the map in a new conversation', async () => {
    const user = await failedInFrame();
    server.on('POST /assistant/messages', ANSWERED);

    await user.press(screen.getByRole('button', { name: '뒤로' }));
    expect(input()).toHaveDisplayValue(ASKED);
    expect(input()).toHaveProp('placeholder', '무엇이든 물어보세요');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(1000);

    expect(sentBodies().at(-1)).toEqual(sentWith([{ role: 'user', text: ASKED }]));
    expect(card().getByText(REPLY)).toBeVisible();
    expect(input()).toHaveDisplayValue('');
    await user.press(screen.getByTestId('answer-caption'));
    const list = within(screen.getByTestId('question-list'));
    expect(list.getAllByTestId('question-row')).toHaveLength(2);
    expect(list.getByRole('button', { name: /배고파, 답을 가져오지 못함$/u })).toBeVisible();
  });
});

// Partitions: waiting, then the reply.
describe('waiting for the reply (n18)', () => {
  it('shows the question as the caption and the dots, labelled 보는 중, with a 그만 icon button, and keeps the input', async () => {
    const user = await openMain();

    await send(user, ASKED);

    expect(card().getByTestId('answer-caption')).toHaveTextContent(ASKED);
    expect(card().getByLabelText('보는 중')).toBeVisible();
    expect(card().queryByText('보는 중')).toBeNull();
    expect(card().getByRole('button', { name: '그만' })).toBeVisible();
    expect(card().queryByText('그만')).toBeNull();
    expect(input()).toHaveProp('placeholder', '이어서 말하기');
  });

  it('keeps the card as high as the reply before while the next one is on its way', async () => {
    const user = await openMain();
    await ask(user);
    const content = screen.getByTestId('answer-card-content');
    await fireEvent(content, 'contentSizeChange', 390, 420);

    await send(user, '한식');
    await fireEvent(content, 'contentSizeChange', 390, 120);

    expect(content.props.contentContainerStyle).toContainEqual({ minHeight: 420 });
  });

  it("starts at the top of the card, where the next question's caption stands, however far the reply was scrolled", async () => {
    const scrolled = jest.spyOn(ScrollView.prototype, 'scrollTo');
    const user = await openMain();
    await ask(user);
    scrolled.mockClear();

    await send(user, '한식');

    expect(scrolled).toHaveBeenCalledWith({ y: 0, animated: false });
  });

  it('brings the input back with the reply', async () => {
    const user = await openMain();

    await ask(user);

    expect(card().getByText(REPLY)).toBeVisible();
    expect(card().queryByLabelText('보는 중')).toBeNull();
    expect(card().queryByRole('button', { name: '그만' })).toBeNull();
    expect(input()).toHaveProp('placeholder', '이어서 말하기');
  });
});

// Partitions: 그만 on a follow-up, and on the first question.
describe('그만 while the reply is on its way (n18)', () => {
  it('takes a follow-up back: the turn before is shown, and the reply is dropped', async () => {
    const user = await openMain();
    await ask(user);
    server.on('POST /assistant/messages', { status: 200, body: { ...ANSWERED.body, text: '한식이요' }, afterMs: 1000 });
    await send(user, '한식');

    await user.press(card().getByRole('button', { name: '그만' }));
    await pass(1000);

    expect(within(screen.getByTestId('answer-caption')).getByText(ASKED)).toBeVisible();
    expect(card().getByText(REPLY)).toBeVisible();
    expect(screen.queryByText('한식이요')).toBeNull();
    await ask(user, '양식');
    expect(sentBodies().at(-1)).toEqual(
      sentWith([
        { role: 'user', text: ASKED },
        { role: 'assistant', text: REPLY, cards: [] },
        { role: 'user', text: '양식' },
      ]),
    );
  });

  it('closes the answer on the first question, forgets the reply on its way, and brings the input back', async () => {
    const user = await openMain();
    await send(user, ASKED);

    await user.press(card().getByRole('button', { name: '그만' }));
    await pass(1000);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(input()).toBeVisible();
    await ask(user, '한식');
    expect(sentBodies().at(-1)).toEqual(sentWith([{ role: 'user', text: '한식' }]));
  });
});

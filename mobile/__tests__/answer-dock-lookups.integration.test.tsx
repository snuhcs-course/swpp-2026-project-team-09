/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { REFUSAL_REPLIES } from '@/api/mock/data/refusals';
import { WAY_LOOKUP_REPLY } from '@/api/mock/data/way-lookup';
import { NOT_RUNNING_LOOKUP_REPLY } from '@/api/mock/data/way-lookups';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { ASKED, askOnMap, card, mapThings } from './support/answer-map';
import { answerEvents, MAJOR } from './support/events';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 05: the bottom hides only what the map already says. A way Lookup docks with "길 안내" beside the input
// and no lines; the shuttle not running, a refusal, and a failure dock as their first line, whose press raises the
// rest, with their buttons as chips; a procedure in words and a reply with cards keep their card open.

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

const NOT_RUNNING = '셔틀은 지금 다니지 않아요 (평일 8–21시)';
// The model's words beside those Lookups, which are the dock's line (P04 ticket 18).
const NOT_RUNNING_WORDS = '셔틀은 지금 다니지 않아요.';
const WAY_WORDS = '문화관은 지금 있는 301동에서 걸어서 18분이에요.';
const WALK = '(관악사)학부 생활관(919동)까지 걸어서 11분이에요';
const HOMEWORK = '자료구조 과제 풀어 줘';
const CANNOT = '과제는 도와 드릴 수 없어요.';
const INSTEAD = '캠퍼스에서 먹을 곳, 공부할 자리, 행사, 파티, 길을 찾아 드려요.';
const FAILED_FIRST = '답을 가져오지 못했어요.';
const FAILED_SECOND = '연결이 끊겼거나 서버가 답하지 않았어요. 쓴 말은 입력칸에 그대로 두었어요.';
const PROCEDURE = '학생증은 이렇게 받아요.\n1. MySNU에서 신청해요\n2. 다음 날 67동 2층에서 받아요';

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

function dock(): ReturnType<typeof within> {
  return within(screen.getByTestId('dock-row'));
}

type User = Awaited<ReturnType<typeof openMain>>;

// Starts the app and asks; the main server fails the request.
async function askFailing(): Promise<User> {
  server.on('POST /assistant/messages', refusal(503));
  const user = await openMain();
  await user.type(screen.getByLabelText(AI_INPUT), ASKED);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

function sentBodies(): unknown[] {
  return server.received('POST /assistant/messages').map(({ body }) => body);
}

// Partitions: a Lookup the map draws, and one whose answer is words the map does not show.
describe('a Lookup in the dock', () => {
  it('draws a way on the map with "길 안내" beside the input and the model\'s words as the one line', async () => {
    await askOnMap(server, WAY_LOOKUP_REPLY);

    expect(mapThings()).toContain('문화관(73동) · 걸어서 18분');
    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '길 안내' })).toBeVisible();
    expect(card().getByTestId('dock-line')).toHaveTextContent(WAY_WORDS, { exact: false });
    expect(card().queryByTestId('lookup-card')).toBeNull();
    expect(card().queryByRole('button', { name: '근거 ›' })).toBeNull();
  });

  it("reaches a first way's card, its chips, basis, and 닫기, from 근거 when the model said nothing", async () => {
    const user = await askOnMap(server, { ...WAY_LOOKUP_REPLY, text: '' });

    expect(card().queryByTestId('dock-line')).toBeNull();
    await user.press(card().getByRole('button', { name: '근거 ›' }));

    expect(card().getByTestId('lookup-card')).toBeVisible();
    expect(card().getByRole('button', { name: '닫기' })).toBeVisible();
    expect(card().getByRole('button', { name: /근거/u })).toBeVisible();
  });

  it('keeps "길 안내" from acting on the turn before while the next reply is on its way', async () => {
    const user = await askOnMap(server, WAY_LOOKUP_REPLY);
    server.on('POST /assistant/messages', { status: 200, body: NOT_RUNNING_LOOKUP_REPLY, afterMs: 5000 });

    await user.type(screen.getByLabelText(AI_INPUT), '민수 어디야?');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(300);

    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '길 안내' })).toBeDisabled();
  });

  it('says that the shuttle is not running in one line, whose press raises the rest', async () => {
    const user = await askOnMap(server, NOT_RUNNING_LOOKUP_REPLY);

    expect(card().getByText(NOT_RUNNING_WORDS)).toBeVisible();
    expect(card().queryByText(WALK)).toBeNull();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();

    await user.press(card().getByText(NOT_RUNNING_WORDS));

    expect(card().getByTestId('lookup-card')).toBeVisible();
    expect(card().getByText(NOT_RUNNING)).toBeVisible();
    expect(card().getByText(WALK)).toBeVisible();
  });
});

// Partitions: the line, and an offer pressed.
describe('a refusal in the dock', () => {
  it("shows a refusal's first line with its offers as chips, and a press on the line raises the whole text", async () => {
    const reply = REFUSAL_REPLIES.get(HOMEWORK);
    const user = await askOnMap(server, { ...reply, text: '그건 도와 드릴 수 없어요.' });

    expect(card().getByText(CANNOT)).toBeVisible();
    expect(card().queryByText(INSTEAD)).toBeNull();
    for (const label of ['배고파', '공부할 자리', '오늘 볼 만한 거 있어?']) {
      expect(dock().getByRole('button', { name: label })).toBeVisible();
    }

    await user.press(card().getByText(CANNOT));

    expect(card().getByText(INSTEAD)).toBeVisible();
    expect(card().getByTestId('refusal-offers')).toBeVisible();
  });

  it('sends an offer from its chip as a new turn', async () => {
    const reply = REFUSAL_REPLIES.get(HOMEWORK);
    const user = await askOnMap(server, { ...reply, text: '그건 도와 드릴 수 없어요.' });

    await user.press(dock().getByRole('button', { name: '공부할 자리' }));
    await pass(500);

    expect(sentBodies().at(-1)).toMatchObject({
      messages: [
        { role: 'user', text: ASKED },
        { role: 'assistant', text: '그건 도와 드릴 수 없어요.' },
        { role: 'user', text: '공부할 자리' },
      ],
    });
  });
});

// Partitions: the line, and 다시 시도 pressed.
describe('a failure in the dock', () => {
  it('shows a failure in one line with 다시 시도, and a press on the line raises the whole text', async () => {
    const user = await askFailing();

    expect(card().getByText(FAILED_FIRST)).toBeVisible();
    expect(card().queryByText(FAILED_SECOND)).toBeNull();
    expect(dock().getByRole('button', { name: '다시 시도' })).toBeVisible();

    await user.press(card().getByText(FAILED_FIRST));

    expect(card().getByText(FAILED_SECOND)).toBeVisible();
  });

  it('sends the same message again from the 다시 시도 chip', async () => {
    const user = await askFailing();

    await user.press(dock().getByRole('button', { name: '다시 시도' }));
    await pass(500);

    const [first, again] = sentBodies();
    expect(sentBodies()).toHaveLength(2);
    expect(again).toEqual(first);
  });
});

// Partitions: words with nothing to draw, and a reply with cards.
describe('a reply the map does not carry', () => {
  it('keeps a procedure in words open in the card, whole', async () => {
    await askOnMap(server, { text: PROCEDURE, mapButtons: [], cards: [], proposal: null });

    expect(card().getByText('학생증은 이렇게 받아요.')).toBeVisible();
    expect(card().getByText('MySNU에서 신청해요')).toBeVisible();
    expect(card().getByText('다음 날 67동 2층에서 받아요')).toBeVisible();
    expect(screen.queryByTestId('dock-row')).toBeNull();
  });

  it('keeps a reply with an event card open', async () => {
    answerEvents(server);
    await askOnMap(server, {
      text: '설명회가 있어요.',
      mapButtons: [],
      cards: [{ kind: 'globalEvent', globalEvent: MAJOR }],
      proposal: null,
    });

    expect(card().getByText('설명회가 있어요.')).toBeVisible();
    expect(card().getByRole('link', { name: MAJOR.title })).toBeVisible();
    expect(screen.queryByTestId('dock-row')).toBeNull();
  });
});

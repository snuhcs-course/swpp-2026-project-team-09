/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { Text } from 'react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';
import { LEE_MINSU, WHICH_MINSU_REPLY } from './support/which-friend';
import { REFUSAL_REPLIES, type RefusalReply } from '@/api/mock/data/refusals';

// What cannot be answered, in the answer frame against the fake main server (P02 ticket 10): the card shows the
// refusal's lines in place of the model's sentence and its offers as buttons; an ask sends its words as a new turn,
// and an open goes to its screen. The pill stays, with no condition chip and no 근거.

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

// The model's own sentence, which an app that does not know the refusal shows.
const SENTENCE = '그건 도와 드릴 수 없어요.';

// Ticket 11 builds the 위치 공유 screen; here it stands in by its title.
const MORE = { '(signed-in)/me/location-sharing': (): React.JSX.Element => <Text>위치 공유 화면</Text> };

let server: FakeServer;

function copyOf(words: string): RefusalReply {
  const reply = REFUSAL_REPLIES.get(words);
  if (reply === undefined) {
    throw new Error(`No stored refusal for ${words}`);
  }
  return reply;
}

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

async function askRefused(words: string): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: { ...copyOf(words), text: SENTENCE }, afterMs: 1000 });
  const user = await openMain({ answerOnMap: true }, MORE);
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(1000);
  return user;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function lastSent(): unknown {
  return server.received('POST /assistant/messages').at(-1)?.body;
}

describe('the card of a refusal', () => {
  it("shows the lines in place of the model's sentence, then the offers, with the pill and no chips (board n2)", async () => {
    await askRefused('자료구조 과제 풀어 줘');

    expect(card().getByText('과제는 도와 드릴 수 없어요.')).toBeVisible();
    expect(card().getByText('캠퍼스에서 먹을 곳, 공부할 자리, 행사, 파티, 길을 찾아 드려요.')).toBeVisible();
    expect(card().queryByText(SENTENCE)).toBeNull();
    for (const label of ['배고파', '공부할 자리', '오늘 볼 만한 거 있어?']) {
      expect(card().getByRole('button', { name: label })).toBeVisible();
    }
    expect(within(screen.getByTestId('answer-pill')).getByText('자료구조 과제 풀어 줘')).toBeVisible();
    expect(screen.queryByTestId('condition-chips')).toBeNull();
    expect(card().queryByText('근거')).toBeNull();
  });

  it('sends an ask offer as a new turn of the conversation (board n1)', async () => {
    const user = await askRefused('강남역 맛집 추천해 줘');

    await user.press(card().getByRole('button', { name: '오늘 볼 만한 거 있어?' }));
    await pass(1000);

    expect(lastSent()).toMatchObject({
      messages: [
        { role: 'user', text: '강남역 맛집 추천해 줘' },
        { role: 'assistant', text: SENTENCE },
        { role: 'user', text: '오늘 볼 만한 거 있어?' },
      ],
    });
  });

  it('opens 친구 추가 from not-a-friend (board n5)', async () => {
    const user = await askRefused('우리 과 조교님 어디 계셔?');

    await user.press(card().getByRole('button', { name: '친구 추가' }));
    await pass(500);

    expect(shownAddress()).toBe('/me/friends/add');
  });

  it('opens the 위치 공유 screen from who-looked (board n7)', async () => {
    const user = await askRefused('누가 내 위치 찾아봤어?');

    await user.press(card().getByRole('button', { name: '위치 공유 보기' }));
    await pass(500);

    expect(shownAddress()).toBe('/me/location-sharing');
    expect(screen.getByText('위치 공유 화면')).toBeVisible();
  });
});

// P02 ticket 17: the question of which Friend, answered with one press.
const ASKED = '민수랑 점심';
const LEE = { kind: 'friend', userId: LEE_MINSU.userId };

async function askWhich(): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: WHICH_MINSU_REPLY, afterMs: 1000 });
  const user = await openMain({ answerOnMap: true }, MORE);
  await user.type(screen.getByLabelText(AI_INPUT), ASKED);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(1000);
  return user;
}

function sent(): unknown[] {
  return server.received('POST /assistant/messages').map(({ body }) => body);
}

describe('a Friend picked from the question', () => {
  it("sends the cell's words as the User's with that Friend tapped, for that request only", async () => {
    const user = await askWhich();
    expect(card().getByText('민수가 두 명이에요')).toBeVisible();
    expect(card().getByText('누구와 먹을까요?')).toBeVisible();

    await user.press(card().getByRole('button', { name: '이민수, 경영학과' }));
    await pass(1000);

    expect(lastSent()).toMatchObject({
      messages: [
        { role: 'user', text: ASKED },
        { role: 'assistant', text: WHICH_MINSU_REPLY.text },
        { role: 'user', text: '이민수' },
      ],
      context: { tapped: LEE },
    });

    await user.type(screen.getByLabelText(AI_INPUT), '1시에');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(1000);

    expect(sent()).toHaveLength(3);
    expect(lastSent()).toMatchObject({ context: { tapped: null } });
    expect(sent()[0]).toMatchObject({ context: { tapped: null } });
  });

  it('sends the same Friend tapped again with 다시 시도', async () => {
    const user = await askWhich();
    server.on('POST /assistant/messages', refusal(503));

    await user.press(card().getByRole('button', { name: '이민수, 경영학과' }));
    await pass(1000);
    server.on('POST /assistant/messages', { status: 200, body: copyOf('강남역 맛집 추천해 줘'), afterMs: 1000 });
    await user.press(card().getByRole('button', { name: '다시 시도' }));
    await pass(1000);

    const [, pressed, again] = sent();
    expect(pressed).toMatchObject({ context: { tapped: LEE } });
    expect(again).toEqual(pressed);
  });
});

describe("a Friend's profile from the question", () => {
  it("opens over the card from the cell's mark, and picks no one", async () => {
    server.on('GET /friends', {
      status: 200,
      body: [{ ...MIN_JUN, id: LEE_MINSU.userId, name: LEE_MINSU.label, department: LEE_MINSU.aside }],
    });
    const user = await askWhich();

    await user.press(card().getByRole('button', { name: '이민수 프로필' }));

    expect(within(screen.getByTestId('map-card')).getByRole('header', { name: '이민수' })).toBeVisible();
    expect(card().getByText('민수가 두 명이에요')).toBeVisible();
    expect(sent()).toHaveLength(1);
  });
});

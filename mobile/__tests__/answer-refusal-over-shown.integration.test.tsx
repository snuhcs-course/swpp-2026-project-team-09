/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { REFUSAL_REPLIES, type RefusalReply } from '@/api/mock/data/refusals';
import { NOT_RUNNING_LOOKUP_REPLY } from '@/api/mock/data/way-lookups';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { raiseCard } from './support/card-grip';
import { askOnMap, card, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// A refusal over what is on screen (P02 ticket 15), in the answer frame against the fake main server with the main
// server's real replies: the refusal's lines in place of a Lookup's beside it, with its offer as the main button
// (boards n4, n20); a refusal to accept for a Friend that keeps the party or the Plan on screen and puts its line over
// the card's first (n8b), a Plan's own lines being on the map; and the way asked about the shuttle when it is not
// running (n21).

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

type User = Awaited<ReturnType<typeof askOnMap>>;

const INVITE = '만들고 초대 보내기';

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

async function say(user: User, words: string, reply: object): Promise<void> {
  server.on('POST /assistant/messages', { status: 200, body: reply });
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

function lastAsked(): unknown {
  const body = server.received('POST /assistant/messages').at(-1)?.body;
  return typeof body === 'object' && body !== null && 'messages' in body ? body.messages : undefined;
}

// Partitions: a refusal with a Friend Lookup, whose only offer stands where the Lookup's action would; one with a way
// Lookup, whose offer stands in place of "길 안내". Each starts with the refusal's lines, its offer beside the input (P04
// ticket 05), and the rest under them in the one sheet (P04 ticket 61). Expected values: boards n4 and n20.
describe('a refusal beside a Lookup', () => {
  it("draws 민수 and puts the refusal's lines in place of the Lookup's, with 만나고 싶다 and ✕ (board n4)", async () => {
    const user = await askOnMap(server, copyOf('민수 지금 무슨 수업 들어?'));

    expect(card().getByText('과목과 강의실은 보이지 않아요')).toBeVisible();
    expect(mapThings()).toContain('민수 · 수업 중 12:15까지');
    expect(card().queryByRole('button', { name: '닫기' })).toBeNull();

    await raiseCard();

    expect(card().getByText('민수 · 시간표')).toBeVisible();
    expect(card().getByText('12:15에 302동에서 수업이 끝나요')).toBeVisible();
    expect(card().queryByText('민수는 12:15까지 302동 수업이에요')).toBeNull();
    expect(card().queryByText('지금 위치는 보여 주지 않아요')).toBeNull();
    expect(card().getByRole('button', { name: '답 닫기' })).toBeVisible();

    await user.press(beside().getByRole('button', { name: '만나고 싶다' }));
    await pass(500);

    expect(lastAsked()).toEqual(expect.arrayContaining([{ role: 'user', text: '민수랑 만나고 싶어' }]));
  });

  it("draws the way to 신양 with the refusal's lines, and 관정 스터디룸 in place of 길 안내 (board n20)", async () => {
    const user = await askOnMap(server, copyOf('신양 스터디룸 예약해 줘'));

    expect(card().getByText('앱이 예약하는 곳은 관정뿐이에요')).toBeVisible();
    expect(screen.queryByRole('button', { name: '길 안내' })).toBeNull();

    await raiseCard();

    expect(card().getByText('301동에서')).toBeVisible();
    expect(card().getByText('신양학술정보관은 그곳의 방식으로 예약해요')).toBeVisible();
    expect(card().queryByText('신양학술정보관(44-1동)은 여기예요')).toBeNull();
    expect(screen.queryByRole('button', { name: '길 안내' })).toBeNull();
    expect(card().getByRole('button', { name: '답 닫기' })).toBeVisible();

    await user.press(beside().getByRole('button', { name: '관정 스터디룸' }));
    await pass(500);

    expect(lastAsked()).toEqual(expect.arrayContaining([{ role: 'user', text: '관정 스터디룸' }]));
  });
});

// Partitions: the invited party on screen; a Plan not yet sent. Expected values: board n8b, and the stored answer's
// first Plan, "12:15 302동식당".
describe('a refusal to accept for a Friend (board n8b)', () => {
  it("keeps the invited party on screen and puts its line in place of the card's first", async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(beside().getByRole('button', { name: INVITE }));
    await pass(500);

    await say(user, '민수 대신 수락해 줘', copyOf('민수 대신 수락해 줘'));

    expect(card().getByText('수락은 민수가 직접 해요')).toBeVisible();
    expect(card().getByText('12:15 302동식당 · 수락하면 알려 드려요')).toBeVisible();
    expect(card().queryByText('김민수에게 점심 초대를 보냈어요')).toBeNull();
    expect(card().getByText('김민수 · 아직 안 봄')).toBeVisible();
    expect(mapThings()).toContain('민수 · 아직 안 봄');
    expect(card().getByRole('button', { name: '답 닫기' })).toBeVisible();
  });

  it('keeps the Plan on screen and says only its line in the card', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await say(user, '민수 대신 수락해 줘', copyOf('민수 대신 수락해 줘'));

    expect(card().getByText('수락은 민수가 직접 해요')).toBeVisible();
    expect(card().queryByText('12:15 302동식당')).toBeNull();
    expect(mapThings()).toContain('302동식당 · 12:15 점심');
    expect(beside().getByRole('button', { name: INVITE })).toBeVisible();
  });
});

// Expected values: board n21, on the copy written at 22:10 at 관정; the model's words are the dock's line (P04 ticket
// 18).
describe('a way asked about the shuttle when it is not running (board n21)', () => {
  it('says so in the dock, and raised, the walk with only ✕', async () => {
    const user = await askOnMap(server, NOT_RUNNING_LOOKUP_REPLY);

    expect(card().getByText(NOT_RUNNING_LOOKUP_REPLY.text)).toBeVisible();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();

    await user.press(card().getByText(NOT_RUNNING_LOOKUP_REPLY.text));

    expect(card().getByText('셔틀은 지금 다니지 않아요 (평일 8–21시)')).toBeVisible();
    expect(card().getByText('(관악사)학부 생활관(919동)까지 걸어서 11분이에요')).toBeVisible();
    expect(screen.queryByRole('button', { name: '길 안내' })).toBeNull();
    expect(card().getByRole('button', { name: '답 닫기' })).toBeVisible();
  });
});

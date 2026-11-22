/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { NEW_QUEST_ANSWER } from '@/api/mock/data/new-quest-answer';
import type { NewQuestInput } from '@/api/recruiting-plan-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card, timeBar } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import {
  answerRecalculations,
  ASKER,
  firstPlan,
  GYM,
  NEW_QUEST_REPLY,
  POSTED,
  POSTED_ALONE,
  sayOnMap,
  SEO_JUN,
} from './support/row-four';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// A new party's answer in the answer frame (P02 ticket 30, boards Together 8 to 11 and Recruit 4 and 5), over the fake
// main server, which answers "새로 모집" with the stored real answer of row 5: badminton at the gymnasium at 17:10
// with 서준. Its Friends added and removed, and "만들고 모집하기" down to POST /plans. Expected values: the ticket's inputs
// and words, and the stored answer's.

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

const ASKED = '새로 모집';
const POST = '만들고 모집하기';
const plan = firstPlan(NEW_QUEST_ANSWER);
const ALONE = [{ userId: ASKER, constraints: [] }];

function newPartyOf({ input }: AnswerReply): NewQuestInput {
  if (input.kind !== 'new-quest') {
    throw new Error('The copy is no new party');
  }
  return input;
}

const STORED = newPartyOf(NEW_QUEST_ANSWER);

// The stored party with the asker alone, as the main server answers it after 서준's 빼기: 서준 among the Friends who
// could come, with the line of his day (board Recruit 4).
const OPEN_TO_ALL: AnswerReply = {
  ...NEW_QUEST_ANSWER,
  input: { ...STORED, people: ALONE },
  chips: NEW_QUEST_ANSWER.chips.filter(({ kind }) => kind !== 'person'),
  plans: [{ ...plan, candidates: [{ userId: SEO_JUN, name: '서준', line: '서준 · 16:45 24동 수업 끝' }] }],
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerRecalculations(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof sayOnMap>>;

// Asks with the stage laid out, so that the marks of the map take presses.
async function sayWithMarks(reply: typeof NEW_QUEST_REPLY): Promise<User> {
  const user = await sayOnMap(server, ASKED, reply);
  await layStage(390, 760);
  return user;
}

async function pressOnMap(user: User, name: string | RegExp): Promise<ReturnType<typeof within>> {
  await user.press(within(screen.getByTestId('main-map-touches')).getByRole('button', { name }));
  return within(screen.getByTestId('mark-card'));
}

// Partitions: what the bottom, the flag, and the faces of a party with a Friend in it offer.
describe("a new party's answer (board Recruit 4)", () => {
  it('draws the time, "＋ 같이" to invite, and "만들고 모집하기", and its flag the Place, the count, and 서준', async () => {
    const user = await sayWithMarks(NEW_QUEST_REPLY);

    expect(timeBar().getByText('17:10–17:40 · 30분')).toBeVisible();
    expect(card().getByRole('button', { name: '초대할 친구 추가' })).toBeEnabled();
    expect(card().getByRole('button', { name: POST })).toBeEnabled();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();
    expect(screen.queryByLabelText('시작 시각')).toBeNull();
    const flag = await pressOnMap(user, '배드민턴 · 17:10 배드민턴');
    expect(flag.getByText('공개')).toBeVisible();
    expect(flag.getByText('4명')).toBeVisible();
    expect(flag.getByText('서준')).toBeVisible();
  });

  it("offers 서준's 빼기 on his face, and no other building on the User's start", async () => {
    const user = await sayWithMarks(NEW_QUEST_REPLY);

    expect((await pressOnMap(user, /^서준/u)).getByRole('button', { name: '서준 빼기' })).toBeEnabled();
    await user.press(screen.getByRole('button', { name: '카드 닫기' }));
    const start = await pressOnMap(user, /^나 · /u);
    expect(start.queryByRole('button', { name: '다른 건물에서 출발', disabled: false })).toBeNull();
  });
});

// Partitions: the list of Friends open; a Friend who could come; a Friend taken out.
describe("a new party's Friends (board Recruit 4)", () => {
  it('asks who to invite while the list of Friends is open', async () => {
    const user = await sayOnMap(server, ASKED, NEW_QUEST_REPLY);

    await user.press(card().getByRole('button', { name: '초대할 친구 추가' }));

    expect(card().getByText('누구를 초대할까요?')).toBeVisible();
  });

  it('draws the Friend who could come with the line of his day, and adding him recalculates', async () => {
    const user = await sayOnMap(server, ASKED, { ...NEW_QUEST_REPLY, answer: OPEN_TO_ALL });
    expect(card().getByText('16:45 24동 수업 끝')).toBeVisible();

    await user.press(card().getByRole('button', { name: '서준, 16:45 24동 수업 끝, 추가' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { ...STORED, people: [...ALONE, { userId: SEO_JUN, constraints: [] }] },
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set'],
      },
    ]);
  });

  it('removes 서준 with 빼기 on his face, which recalculates with the asker alone', async () => {
    const user = await sayWithMarks(NEW_QUEST_REPLY);

    await user.press((await pressOnMap(user, /^서준/u)).getByRole('button', { name: '서준 빼기' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { ...STORED, people: ALONE },
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set'],
      },
    ]);
  });
});

// Partitions: a party with 서준 invited; one with nobody invited.
describe('"만들고 모집하기" (boards Together 11 and Recruit 5)', () => {
  it('posts the party through POST /plans with a key, and the card says what was posted', async () => {
    server.on('POST /plans', { status: 201, body: POSTED });
    const user = await sayOnMap(server, ASKED, NEW_QUEST_REPLY);

    await user.press(card().getByRole('button', { name: POST }));
    await pass(500);

    const sent = server.received('POST /plans');
    expect(sent.map(({ body }) => body)).toEqual([
      {
        input: NEW_QUEST_ANSWER.input,
        planId: GYM,
        startAt: '2026-11-19T17:10:00+09:00',
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set'],
      },
    ]);
    expect(sent[0]?.idempotencyKey).toMatch(/^[\da-f-]{36}$/u);
    expect(card().getByText('파티를 만들고 초대를 보냈어요')).toBeVisible();
    const steps = within(card().getByTestId('quest-steps'));
    expect(steps.getByText('유상, 서준: 체육관 앞에서 만나기')).toBeVisible();
    expect(steps.getByText('배드민턴')).toBeVisible();
    expect(card().getByText('서준 · 아직 안 봄')).toBeVisible();
  });

  it('says the party was posted, and when to be there, when nobody was invited', async () => {
    server.on('POST /plans', { status: 201, body: POSTED_ALONE });
    const user = await sayOnMap(server, ASKED, { ...NEW_QUEST_REPLY, answer: OPEN_TO_ALL });

    await user.press(card().getByRole('button', { name: POST }));
    await pass(500);

    expect(server.received('POST /plans').map(({ body }) => body)).toEqual([
      {
        input: OPEN_TO_ALL.input,
        planId: GYM,
        startAt: '2026-11-19T17:10:00+09:00',
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set'],
      },
    ]);
    expect(card().getByText('파티를 모집했어요')).toBeVisible();
    expect(card().getByText('17:10에 가면 돼요')).toBeVisible();
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { NEW_QUEST_ANSWER } from '@/api/mock/data/new-quest-answer';
import type { NewQuestInput } from '@/api/recruiting-plan-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
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
// with 서준. Its Friends added and removed, and "이대로 모집" down to POST /plans. Expected values: the ticket's inputs
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
const POST = '이대로 모집';
const plan = firstPlan(NEW_QUEST_ANSWER);
const ALONE = [{ userId: ASKER, constraints: [] }];

function newPartyOf({ input }: AnswerReply): NewQuestInput {
  if (input.kind !== 'new-quest') {
    throw new Error('The copy is no new party');
  }
  return input;
}

const STORED = newPartyOf(NEW_QUEST_ANSWER);

// The stored party with the asker alone, as the main server answers it after 서준's ✕: 서준 among the Friends who
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

// Partitions: a party with a Friend in it; one open to all with a Friend who could come.
describe("a new party's answer (board Recruit 4)", () => {
  it('draws the time, the Place, the count, 서준 with his ✕, "＋ 같이" to invite, and "이대로 모집"', async () => {
    await sayOnMap(server, ASKED, NEW_QUEST_REPLY);

    expect(card().getByText('17:10 체육관 · 4명 공개 모집')).toBeVisible();
    expect(card().getByText('17:02에 도착해서 17:10에 모여요')).toBeVisible();
    expect(card().getByRole('button', { name: '서준 빼기' })).toBeEnabled();
    expect(card().getByRole('button', { name: '초대할 친구 추가' })).toBeEnabled();
    expect(card().getByRole('button', { name: POST })).toBeEnabled();
    expect(card().queryByRole('button', { name: '이대로 초대' })).toBeNull();
    expect(screen.queryByLabelText('시작 시각')).toBeNull();
    expect(card().getByRole('button', { name: '301동에서' })).toBeDisabled();
  });

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
      { input: { ...STORED, people: [...ALONE, { userId: SEO_JUN, constraints: [] }] }, location: ON_CAMPUS },
    ]);
  });

  it('removes 서준 with his ✕, which recalculates with the asker alone', async () => {
    const user = await sayOnMap(server, ASKED, NEW_QUEST_REPLY);

    await user.press(card().getByRole('button', { name: '서준 빼기' }));
    await pass(500);

    expect(recalculations(server)).toEqual([{ input: { ...STORED, people: ALONE }, location: ON_CAMPUS }]);
  });
});

// Partitions: a party with 서준 invited; one with nobody invited.
describe('"이대로 모집" (boards Together 11 and Recruit 5)', () => {
  it('posts the party through POST /plans with a key, and the card says what was posted', async () => {
    server.on('POST /plans', { status: 201, body: POSTED });
    const user = await sayOnMap(server, ASKED, NEW_QUEST_REPLY);

    await user.press(card().getByRole('button', { name: POST }));
    await pass(500);

    const sent = server.received('POST /plans');
    expect(sent.map(({ body }) => body)).toEqual([
      { input: NEW_QUEST_ANSWER.input, planId: GYM, startAt: '2026-11-19T17:10:00+09:00', location: ON_CAMPUS },
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
      { input: OPEN_TO_ALL.input, planId: GYM, startAt: '2026-11-19T17:10:00+09:00', location: ON_CAMPUS },
    ]);
    expect(card().getByText('파티를 모집했어요')).toBeVisible();
    expect(card().getByText('17:10에 가면 돼요')).toBeVisible();
  });
});

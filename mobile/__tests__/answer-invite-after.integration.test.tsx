/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { Quest } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, FIRST_PLAN_MARKS, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, DINNER, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';

// What follows a press of "만들고 초대 보내기" beside the input, once "이대로 초대" on the card, for the answer to "배고파, 민수랑 같이" (P02 ticket 05), against the
// fake main server: a signal of 민수's answer, each refusal, and "닫기". The Quest is the stored
// reply to POST /plans for the first Plan, with 민수 invited.

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

const INVITE = '만들고 초대 보내기';
const PICK = '302동식당 · 12:15 점심';
const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
const ASKER = { id: '11ca538e-e4ef-48d9-9a1f-b7160c553bee', name: '유상', department: '컴퓨터공학부' };

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

// The Plan's main button beside the input (P04 ticket 04).
function inviteButton(): ReturnType<typeof screen.getByRole> {
  return within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: INVITE });
}

function toasts(): ReturnType<typeof within> {
  return within(screen.getByTestId('toast-layer'));
}

async function invited(): Promise<void> {
  server.on('POST /plans', { status: 201, body: PLAN_QUEST });
  const user = await askOnMap(server, MEAL_ANSWER_REPLY);
  await user.press(inviteButton());
  await pass(500);
}

async function signal(name: string, payload?: object): Promise<void> {
  await socketServer((socket) => {
    socket.send(name, payload);
  });
  await pass(500);
}

// Partitions: before any answer; the signal of an acceptance for this Quest; the signal of a decline; the Quests read
// again with the Quest's members and no signal of an answer. Expected values: the P02 spec, "How each Friend stands".
describe('how 민수 stands after inviting', () => {
  it('reads "아직 안 봄" on the chip and the face, and "수락" at once on the signal of an acceptance', async () => {
    await invited();
    expect(mapThings()).toContain('민수 · 아직 안 봄');

    await signal('invitation-accepted', { questId: PLAN_QUEST.quest.id, userId: MINSU });

    expect(card().getByText('김민수 · 수락')).toBeVisible();
    expect(card().queryByText('김민수 · 아직 안 봄')).toBeNull();
    expect(mapThings()).toContain('민수 · 수락');
    expect(mapThings()).not.toContain('민수');
  });

  it('reads "거절" on the signal of a decline', async () => {
    await invited();

    await signal('invitation-declined', { questId: PLAN_QUEST.quest.id, userId: MINSU });

    expect(card().getByText('김민수 · 거절')).toBeVisible();
  });

  it('reads "수락" once the User\'s Quests are read again with the Quest\'s members', async () => {
    await invited();
    // The stored reply's Quest with `members` added: the asker accepted and 민수 accepted.
    const withMembers: Quest = {
      ...PLAN_QUEST.quest,
      members: [
        { user: ASKER, state: 'accepted', lateMinutes: null },
        { user: { id: MINSU, name: '민수', department: '컴퓨터공학부' }, state: 'accepted', lateMinutes: null },
      ],
    };
    server.on('GET /quests', { status: 200, body: [DINNER, withMembers] });

    await signal('quests-changed');

    expect(card().getByText('김민수 · 수락')).toBeVisible();
  });
});

// Partitions: 409 PLAN_CHANGED; a refusal of another kind.
describe('a refused "만들고 초대 보내기"', () => {
  it('after PLAN_CHANGED says the Plan changed and recalculates from the same conditions', async () => {
    server.on('POST /plans', refusal(409, 'PLAN_CHANGED'));
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(inviteButton());
    await pass(500);

    expect(toasts().getByText('계획이 바뀌었어요. 다시 확인해 주세요')).toBeVisible();
    expect(recalculations(server)).toEqual([
      {
        input: MEAL_ANSWER.input,
        location: ON_CAMPUS,
        clientCapabilities: SENT_CAPABILITIES,
      },
    ]);
    expect(mapThings()).toContain(PICK);
    expect(inviteButton()).toBeEnabled();
  });

  it('after a 500 says it could not invite and keeps the card of the Plan', async () => {
    server.on('POST /plans', refusal(500));
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(inviteButton());
    await pass(500);

    expect(toasts().getByText('초대하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeVisible();
    expect(recalculations(server)).toEqual([]);
    expect(mapThings()).toEqual(expect.arrayContaining([PICK, '후보 5 · 자하연식당 2층 · 12:35']));
    expect(inviteButton()).toBeEnabled();
    expect(card().queryByText('파티를 만들고 초대를 보냈어요')).toBeNull();
  });

  it('after a 500 sends the same Idempotency-Key at the next press', async () => {
    server.on('POST /plans', refusal(500));
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(inviteButton());
    await pass(500);
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });

    await user.press(inviteButton());
    await pass(500);

    const [first, again] = server.received('POST /plans').map(({ idempotencyKey }) => idempotencyKey);
    expect(again).toBe(first);
    expect(card().getByText('파티를 만들고 초대를 보냈어요')).toBeVisible();
  });
});

// Partitions: a press on a candidate's mark after inviting.
describe('the map after inviting', () => {
  // P04 ticket 17: once the Plan is made, the other candidates are not drawn, so none can be pressed.
  it('leaves no other Plan to press', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(inviteButton());
    await pass(500);

    expect(mapThings().filter((name) => /301동식당|학생회관식당|3식당|자하연식당/u.test(name))).toEqual([]);
    expect(mapThings()).toContain(PICK);
    expect(card().getByText('파티를 만들고 초대를 보냈어요')).toBeVisible();
  });
});

// Partitions: "닫기" on the card after inviting.
describe('"닫기" after inviting', () => {
  it('brings the everyday map back', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const everyday: string[] = [];
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, async () => {
      await pass(0);
      everyday.push(...mapThings());
    });
    await user.press(inviteButton());
    await pass(500);

    await user.press(card().getByRole('button', { name: '닫기' }));
    await pass(500);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(mapThings().filter((name) => FIRST_PLAN_MARKS.includes(name))).toEqual([]);
    expect(mapThings()).toEqual(everyday);
  });
});

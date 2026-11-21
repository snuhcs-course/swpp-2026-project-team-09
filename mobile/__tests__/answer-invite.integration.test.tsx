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
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// "만들고 초대 보내기" (once "이대로 초대") beside the input, over the answer to "배고파, 민수랑 같이" (P02 ticket
// 05), whose first Plan is "12:15 302동식당", against the fake main server. POST /plans answers with the stored reply
// for that Plan: the Quest "302동식당에서 점심" with one step, "302동식당에서 식사" at 12:15, and 민수 invited.

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
const HELD_MS = 3000;
const PICK = '302동식당 · 12:15 점심';
const SECOND = '후보 2 · 301동식당';

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

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

function map(): ReturnType<typeof within> {
  return within(screen.getByTestId('main-map-touches'));
}

// Partitions: a Plan with a Friend; a Plan of the User alone.
describe('the main button', () => {
  it('stands beside the input for a Plan with 민수, the other Plans being flags on the map', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(beside().getByRole('button', { name: INVITE })).toBeEnabled();
    expect(mapThings()).toEqual(expect.arrayContaining([PICK, SECOND]));
  });

  it('is not there for a Plan of the User alone', async () => {
    await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: MEAL_ANSWER_ALONE });

    expect(mapThings()).toContain('301동식당 · 11:50 점심');
    expect(screen.queryByRole('button', { name: INVITE })).toBeNull();
  });
});

// Partitions: the press and its reply, and the card after it.
describe('a press of "만들고 초대 보내기"', () => {
  it('sends the Plan on screen with a key, and the card then says the Quest was made', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(beside().getByRole('button', { name: INVITE }));
    await pass(500);

    const sent = server.received('POST /plans');
    expect(sent.map(({ body }) => body)).toEqual([
      {
        input: MEAL_ANSWER.input,
        planId: '302동식당',
        startAt: MEAL_PLAN_1.startAt,
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set'],
      },
    ]);
    expect(sent[0]?.idempotencyKey).toMatch(/^[\da-f-]{36}$/u);
    expect(card().getByText('파티를 만들고 초대를 보냈어요')).toBeVisible();
    expect(card().getByText('답이 없어도 12:15에 가면 돼요')).toBeVisible();
    const steps = within(card().getByTestId('quest-steps'));
    expect(steps.getByText('12:15')).toBeVisible();
    expect(steps.getByText('302동식당에서 식사')).toBeVisible();
    expect(card().getByText('김민수 · 아직 안 봄')).toBeVisible();
    expect(card().getByText('301동에서')).toBeVisible();
    expect(card().getByRole('button', { name: '닫기' })).toBeEnabled();
  });

  it('leaves no band, no "＋ 같이", and no main button after inviting', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(beside().getByRole('button', { name: INVITE }));
    await pass(500);

    expect(screen.queryByRole('adjustable', { name: '시작 시각' })).toBeNull();
    expect(card().queryByRole('button', { name: '같이 먹을 친구 추가' })).toBeNull();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();
  });
});

// P04 ticket 17: a Plan made draws only itself; nothing can be chosen any more.
describe('the map after inviting', () => {
  it('draws only the Plan made, without the other candidates', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    expect(mapThings()).toContain(SECOND);

    await user.press(beside().getByRole('button', { name: INVITE }));
    await pass(500);

    // No other candidate, numbered or not.
    expect(mapThings().filter((name) => /301동식당|학생회관식당|3식당|자하연식당/u.test(name))).toEqual([]);
    expect(mapThings()).toContain('302동식당 · 12:15 점심');
  });
});

// Partitions: the card's last part. Expected values: fix 5 of the design review of 2026-11-15, "닫기" the secondary
// button across the card's content in the place the main button had.
describe('the card after inviting', () => {
  it('ends with "닫기" across its width', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(beside().getByRole('button', { name: INVITE }));
    await pass(500);

    const close = card().getByRole('button', { name: '닫기' });
    expect(close).toHaveStyle({ alignSelf: 'stretch', height: 40, borderColor: color.borderStrong });
    const holder: unknown = close.parent?.props.testID;
    expect(holder).toBe('invited-card');
  });
});

// Partitions: the list of Friends open and closed again before inviting; the input after inviting. The rule: ticket
// 03, the open list takes the place of the band, the steps, and the input.
describe('"만들고 초대 보내기" beside the list of Friends', () => {
  it('gives way to the open list, and comes back with "그대로"', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: '같이 먹을 친구 추가' }));
    expect(screen.queryByRole('button', { name: INVITE })).toBeNull();
    await user.press(card().getByRole('button', { name: '그대로' }));

    expect(beside().getByRole('button', { name: INVITE })).toBeEnabled();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
  });

  it('leaves the input under the card after inviting', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(beside().getByRole('button', { name: INVITE }));
    await pass(500);

    expect(card().getByTestId('invited-card')).toBeVisible();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
  });
});

// Partitions: a press on each kind of control while the reply is held back, and a second press.
describe('"만들고 초대 보내기" on its way', () => {
  it('waits while the reply is held back, the band and the marks take nothing, and a second press sends nothing', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST, afterMs: HELD_MS });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));

    await user.press(beside().getByRole('button', { name: INVITE }));

    const waiting = beside().getByRole('button', { name: '보내는 중이에요' });
    expect(waiting).toBeDisabled();
    expect(screen.getByRole('adjustable', { name: '시작 시각' })).toBeDisabled();
    await user.press(map().getByLabelText('민수'));
    expect(screen.queryByTestId('mark-card')).toBeNull();
    await user.press(map().getByLabelText(SECOND));
    expect(mapThings()).toContain(PICK);
    await user.press(waiting);
    await pass(HELD_MS);

    expect(server.received('POST /plans')).toHaveLength(1);
    expect(card().getByText('파티를 만들고 초대를 보냈어요')).toBeVisible();
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_FIXED_START } from '@/api/mock/data/meal-answers';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card, mapThings } from './support/answer-map';
import { step } from './support/answer-correct';
import { pass } from './support/app';
import { hasGesture } from './support/swipe';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The ways through the Plans of an answer (P02 ticket 02) since P04 ticket 04: the candidates are numbered flags on
// the map, with no arrows, count, or swipe in the card; the main button stands beside the input; the basis is in the
// pick's card. Over the stored answer to "배고파, 민수랑 같이", whose five Plans are 302동식당, 301동식당,
// 학생회관식당, 3식당, and 자하연식당 2층.

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

const NEXT = '다음 후보';
const BEFORE = '이전 후보';
const INVITE = '만들고 초대 보내기';
const PICK = '302동식당 · 12:15 점심';
// The first Plan's basis, from the stored answer.
const FIRST_BASIS = [
  '민수 12:15 302동 수업 끝',
  '301동 → 302동식당 걸어서 3분',
  '302동식당 → 24동 걸어서 17분, 그래서 12:43에 나서요',
];

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

// Partitions: the first Plan; the third from its flag; the last from its flag; the row with "되돌리기" after a drag.
describe('the candidates on the map', () => {
  it('number the other Plans, with no arrows or count in the card', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(mapThings()).toEqual(
      expect.arrayContaining([PICK, '후보 2 · 301동식당 · 12:18', '후보 5 · 자하연식당 2층 · 12:35']),
    );
    expect(card().queryByRole('button', { name: BEFORE })).toBeNull();
    expect(card().queryByRole('button', { name: NEXT })).toBeNull();
    expect(card().queryByText('1/5')).toBeNull();
  });

  it('go to the third Plan at a press on its flag, and the map draws it', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await press(user, '후보 3 · 학생회관식당 · 12:33');

    expect(mapThings()).toEqual(expect.arrayContaining(['학생회관식당 · 12:33 점심', '후보 1 · 302동식당 · 12:15']));
    expect(screen.getByLabelText('12:18 민수와 만남')).toBeOnTheScreen();
    expect(screen.getByLabelText('민수 · 18분')).toBeOnTheScreen();
    expect(screen.queryByLabelText('나 · 3분')).toBeNull();
  });

  it('go to the last Plan from the first at a press on its flag', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await press(user, '후보 5 · 자하연식당 2층 · 12:35');

    expect(mapThings()).toContain('자하연식당 2층 · 12:35 점심');
  });

  it('leave "되돌리기" alone in the row after a drag, the main button beside the input', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_FIXED_START });
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await step('from', 'increment');

    const row = within(card().getByTestId('plan-steps'));
    const undo = row.getByRole('button', { name: '되돌리기' });
    expect(row.getAllByRole('button')).toEqual([undo]);
    expect(undo.parent).toHaveStyle({ width: 96 });
    expect(row.queryByText('1/2')).toBeNull();
    expect(beside().getByRole('button', { name: INVITE })).toBeEnabled();
  });
});

// Partitions: the main button at rest, and while its request is held back. The rule: P04 ticket 04, the button beside
// the input says what it does, "보내는 중이에요" in its place while the request is on its way.
describe('the main button beside the input', () => {
  it('is the primary button for a Plan with a Friend', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(beside().getByRole('button', { name: INVITE })).toHaveStyle({ backgroundColor: color.snuBlue });
    expect(card().queryByRole('button', { name: INVITE })).toBeNull();
  });

  it('reads "보내는 중이에요" in its place while the request is held back', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST, afterMs: 3000 });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(beside().getByRole('button', { name: INVITE }));

    expect(beside().getByRole('button', { name: '보내는 중이에요' })).toBeDisabled();
    expect(beside().queryByRole('button', { name: INVITE })).toBeNull();
    await pass(3000);
  });
});

// Partitions: no swipe on the card; a candidate's flag while a recalculation is on its way; an answer of one Plan.
describe('the other ways through the Plans', () => {
  it('take no swipe over the card', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(hasGesture('plan-swipe')).toBe(false);
  });

  it("change nothing at a candidate's flag while a recalculation is on its way", async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_ALONE, afterMs: 3000 });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));
    await pressMarker(user, '민수');
    await user.press(within(screen.getByTestId('mark-card')).getByRole('button', { name: '민수 빼기' }));

    await press(user, '후보 2 · 301동식당 · 12:18');

    expect(mapThings()).toContain(PICK);
    await pass(3000);
  });

  it('show no candidates for an answer of one Plan', async () => {
    expect(MEAL_ANSWER_ALONE.plans.length).toBeGreaterThan(0);
    // The stored answer for the User alone, with this one field changed: its first Plan alone.
    const answer = { ...MEAL_ANSWER_ALONE, plans: MEAL_ANSWER_ALONE.plans.slice(0, 1) };

    await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer });

    expect(mapThings().filter((name) => name.startsWith('후보 '))).toEqual([]);
    expect(card().queryByText('1/1')).toBeNull();
  });
});

// Partitions: in the pick's card, not in the answer's; closed with the card; that of the Plan on screen.
describe('the basis', () => {
  it("is in the pick's card, and not in the answer's", async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));
    expect(card().queryByRole('button', { name: '근거' })).toBeNull();

    await pressMarker(user, PICK);

    for (const line of FIRST_BASIS) {
      expect(within(screen.getByTestId('mark-card')).getByText(line)).toBeVisible();
    }
  });

  it('closes with the card', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));
    await pressMarker(user, PICK);

    await press(user, '카드 닫기');
    await pass(100);

    expect(screen.queryByTestId('mark-card')).toBeNull();
    expect(screen.queryByText(FIRST_BASIS[2] ?? '')).toBeNull();
  });

  it('is that of the Plan on screen', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));
    await pressMarker(user, '후보 3 · 학생회관식당 · 12:33');

    await pressMarker(user, '학생회관식당 · 12:33 점심');

    const flag = within(screen.getByTestId('mark-card'));
    expect(flag.getByText('민수 12:15 302동 수업 끝 · 301동까지 걸어서 3분, 같이 15분')).toBeVisible();
    expect(flag.queryByText(FIRST_BASIS[1] ?? '')).toBeNull();
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import * as projection from '@/map/projection';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, layAnswerCard, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS } from './support/main';
import { lookOf, press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// One pending add, shared by a cell of the open list and a Friend's face on the map (P02 ticket 09), over the stored
// answer to "배고파, 민수랑 같이" and the fake main server's Friends: 김민준, whose face is on the map 1.2km from the
// picked 302동식당, and 서지우, who has no position. The add's answer is the stored answer for three, "12:33
// 학생회관식당". The Plan's people and the User's start are changed from their marks on the map (P04 ticket 03).

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

const ADD = '같이 먹을 친구 추가';
const MIN_JUN_CELL = '김민준, 컴퓨터공학부, 1.2km, 추가';
const JI_WOO_CELL = '서지우, 경영학과, 자리 모름, 추가';
const MIN_JUN_ADDING = '김민준, 컴퓨터공학부, 넣는 중';
const JI_WOO_ADDING = '서지우, 경영학과, 넣는 중';
const QUESTION = '누구와 같이 먹을까요?';
const HELD_MS = 3000;
const NOT_RECALCULATED = '다시 계산하지 못했어요. 잠시 후 다시 시도해 주세요';
const PICK = '302동식당 · 12:15 점심';
const PICK_FOR_THREE = '학생회관식당 · 12:33 점심';
const WITH_MIN_JUN = {
  input: { ...MEAL_ANSWER.input, people: [...MEAL_ANSWER.input.people, { userId: MIN_JUN.id, constraints: [] }] },
  location: ON_CAMPUS,
  clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set', 'quest-cancel'],
};

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

type User = Awaited<ReturnType<typeof askOnMap>>;

// Asks, with the stage laid out so that a mark's card opens at a press, unless `laid` is false.
function ask(laid = true): Promise<User> {
  return askOnMap(server, MEAL_ANSWER_REPLY, laid ? () => layStage(390, 760) : undefined);
}

// Asks, with the add's answer held back, and opens the list.
async function openList(laid = true): Promise<User> {
  server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE, afterMs: HELD_MS });
  const user = await ask(laid);
  await user.press(card().getByRole('button', { name: ADD }));
  return user;
}

type Found = ReturnType<typeof screen.getByRole>;

// Checks a button of the card a press on a mark of the map opens, and closes the card again.
async function onMarkCard(user: User, mark: string, name: string, check: (found: Found) => void): Promise<void> {
  await pressMarker(user, mark);
  check(within(screen.getByTestId('mark-card')).getByRole('button', { name }));
  await press(user, '카드 닫기');
}

function disabled(found: Found): void {
  expect(found).toBeDisabled();
}

function enabled(found: Found): void {
  expect(found).toBeEnabled();
}

// Partitions: a cell pressed while the answer is on its way, and when it comes; the Friend without a position, and
// the one whose face is on the map.
describe('a Friend chosen in the list', () => {
  it('reads 넣는 중 in the pressed cell, with the list open and no other cell, chip, or face taking a press', async () => {
    const user = await openList();

    await user.press(card().getByRole('button', { name: JI_WOO_CELL }));

    expect(card().getByText(QUESTION)).toBeVisible();
    const pressed = card().getByRole('button', { name: JI_WOO_ADDING });
    expect(pressed).toHaveTextContent('서지우경영학과넣는 중');
    expect(within(pressed).getByTestId('choice-grid-spinner')).toBeVisible();
    expect(pressed).toBeDisabled();
    expect(card().getByRole('button', { name: MIN_JUN_CELL })).toBeDisabled();
    await user.press(card().getByRole('button', { name: MIN_JUN_CELL }));
    await press(user, MIN_JUN.name);
    await onMarkCard(user, '민수', '민수 빼기', disabled);
    await onMarkCard(user, '나 · 3분', '다른 건물에서 출발', disabled);
    await pass(HELD_MS);
    expect(recalculations(server)).toHaveLength(1);
  });

  it('closes the list when the answer comes, and shows its first Plan', async () => {
    const user = await openList();

    await user.press(card().getByRole('button', { name: JI_WOO_CELL }));
    await pass(HELD_MS - 100);
    expect(card().getByText(QUESTION)).toBeVisible();
    await pass(100);

    expect(card().queryByText(QUESTION)).toBeNull();
    expect(card().queryByTestId('choice-grid')).toBeNull();
    expect(mapThings()).toContain(PICK_FOR_THREE);
    await onMarkCard(user, '지은 · 5분', '지은 빼기', enabled);
  });

  it("lights the Friend's face on the map at once, without its +", async () => {
    const user = await openList();
    expect(lookOf(MIN_JUN.name)).toMatch(/^person:.+:addable$/u);

    await user.press(card().getByRole('button', { name: MIN_JUN_CELL }));

    expect(lookOf(MIN_JUN.name)).toMatch(/^person:.+:selected$/u);
    expect(recalculations(server)).toEqual([WITH_MIN_JUN]);
  });
});

// Partitions: a face pressed with the list closed and with it open.
describe("a Friend's face pressed on the map", () => {
  it('lights at once and takes no second press, and the chips take none while the answer is on its way', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE, afterMs: HELD_MS });
    const user = await ask();

    await press(user, MIN_JUN.name);

    expect(lookOf(MIN_JUN.name)).toMatch(/^person:.+:selected$/u);
    expect(card().getByRole('button', { name: ADD })).toBeDisabled();
    await press(user, MIN_JUN.name);
    await onMarkCard(user, '민수', '민수 빼기', disabled);
    await pass(HELD_MS);
    expect(recalculations(server)).toEqual([WITH_MIN_JUN]);
    expect(mapThings()).toContain(PICK_FOR_THREE);
  });

  it("reads 넣는 중 in that Friend's cell of the open list", async () => {
    const user = await openList();

    await press(user, MIN_JUN.name);

    expect(card().getByRole('button', { name: MIN_JUN_ADDING })).toHaveTextContent('김민준컴퓨터공학부넣는 중');
    expect(card().getByRole('button', { name: JI_WOO_CELL })).toBeDisabled();
  });
});

// Partitions: "그대로" pressed while the add is on its way; the card laid out again once the add's answer is applied.
// Expected values: the ticket's decisions, "그대로" closes the list and the add goes on, and one camera move.
describe('while an add is on its way', () => {
  it('closes the list with 그대로, and the answer to the add still replaces the Plan', async () => {
    const user = await openList();
    await user.press(card().getByRole('button', { name: JI_WOO_CELL }));

    await user.press(card().getByRole('button', { name: '그대로' }));

    expect(card().queryByText(QUESTION)).toBeNull();
    expect(card().queryByTestId('choice-grid')).toBeNull();
    expect(mapThings()).toContain(PICK);
    await pass(HELD_MS);
    expect(mapThings()).toContain(PICK_FOR_THREE);
    expect(card().queryByText(QUESTION)).toBeNull();
    expect(recalculations(server)).toHaveLength(1);
  });

  it('moves the camera once when the answer is applied, after the card is laid out again', async () => {
    const fit = jest.spyOn(projection, 'fit');
    const user = await openList(false);
    await layAnswerCard(380);
    await user.press(card().getByRole('button', { name: JI_WOO_CELL }));
    const before = fit.mock.calls.length;

    await pass(HELD_MS);
    // The list closed with the answer, and the phone lays the card out again: the plain ground lays nothing out.
    await layAnswerCard(240);
    await pass(1000);

    expect(fit.mock.calls).toHaveLength(before + 1);
  });
});

// Partitions: a refusal of the main server.
describe('a failed add', () => {
  it('says so, gives the cell its fact back, keeps the list open, and puts the + back on the face', async () => {
    server.on('POST /assistant/answers', refusal(500));
    const user = await ask();
    await user.press(card().getByRole('button', { name: ADD }));

    await user.press(card().getByRole('button', { name: MIN_JUN_CELL }));
    await pass(500);

    expect(within(screen.getByTestId('toast-layer')).getByText(NOT_RECALCULATED)).toBeVisible();
    expect(card().getByText(QUESTION)).toBeVisible();
    expect(card().getByRole('button', { name: MIN_JUN_CELL })).toBeEnabled();
    expect(card().queryByRole('button', { name: MIN_JUN_ADDING })).toBeNull();
    expect(lookOf(MIN_JUN.name)).toMatch(/^person:.+:addable$/u);
    await onMarkCard(user, '민수', '민수 빼기', enabled);
  });
});

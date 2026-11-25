/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import * as projection from '@/map/projection';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, layAnswerCard, mapThings, timeBar } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS } from './support/main';
import { lookOf, press } from './support/markers';
import { startFresh } from './support/mocks';
import { pickDone, pickRow } from './support/picking';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';

// A Friend picked from their face on the map (P02 ticket 09; P04 ticket 64), over the stored answer to "배고파, 민수랑
// 같이" and the fake main server's Friend 김민준, whose face is on the map and who is not in its conditions. A press on
// the face checks or unchecks the same row of the time card as a press on the row, opening the picking first when it is
// not open, and lights the face while the row is checked; the Plan is asked for once, at 완료, and the answer to it is
// the stored answer for three, "12:33 학생회관식당". The Plan's people and the User's start are changed from their
// marks on the map (P04 ticket 03).

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
const LIT = /^person:.+:selected$/u;
const ADDABLE = /^person:.+:addable$/u;
const HELD_MS = 3000;
const NOT_RECALCULATED = '다시 계산하지 못했어요. 잠시 후 다시 시도해 주세요';
const PICK = '302동식당 · 12:15 점심';
const PICK_FOR_THREE = '학생회관식당 · 12:33 점심';
const WITH_MIN_JUN = {
  input: { ...MEAL_ANSWER.input, people: [...MEAL_ANSWER.input.people, { userId: MIN_JUN.id, constraints: [] }] },
  location: ON_CAMPUS,
  clientCapabilities: SENT_CAPABILITIES,
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

// Picks 김민준 by his face and presses 완료, with the answer held back.
async function pickMinJun(laid = true): Promise<User> {
  server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE, afterMs: HELD_MS });
  const user = await ask(laid);
  await press(user, MIN_JUN.name);
  await user.press(pickDone());
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

// Partitions: a face pressed with the picking closed, and again with it open; the Friend's row pressed.
describe("a Friend's face pressed on the map", () => {
  it('opens the picking with that Friend checked, and lights the face, asking nothing', async () => {
    const user = await ask();
    expect(lookOf(MIN_JUN.name)).toMatch(ADDABLE);

    await press(user, MIN_JUN.name);

    expect(pickRow(MIN_JUN.name)).toBeChecked();
    expect(lookOf(MIN_JUN.name)).toMatch(LIT);
    expect(recalculations(server)).toEqual([]);
  });

  it('unchecks the same row at a second press, and puts the + back', async () => {
    const user = await ask();
    await press(user, MIN_JUN.name);

    await press(user, MIN_JUN.name);

    expect(pickRow(MIN_JUN.name)).not.toBeChecked();
    expect(lookOf(MIN_JUN.name)).toMatch(ADDABLE);
    expect(pickDone()).toHaveTextContent(/^완료$/u);
  });

  it("is lit and put back by a press on that Friend's row", async () => {
    const user = await ask();
    await user.press(timeBar().getByRole('button', { name: ADD }));

    await user.press(pickRow(MIN_JUN.name));
    expect(lookOf(MIN_JUN.name)).toMatch(LIT);
    await user.press(pickRow(MIN_JUN.name));

    expect(lookOf(MIN_JUN.name)).toMatch(ADDABLE);
    expect(recalculations(server)).toEqual([]);
  });
});

// Partitions: the answer to 완료 held back, and when it comes; the card laid out again once it is applied; an answer
// that holds 김민준. Expected values: one camera move, as for any recalculation.
describe('완료 on its way', () => {
  it('ends the picking at once, takes no press on the chip or the marks, and asks once', async () => {
    const user = await pickMinJun();

    expect(screen.queryByTestId('time-card-pick-done')).toBeNull();
    expect(timeBar().getByRole('button', { name: ADD })).toBeDisabled();
    await onMarkCard(user, '민수', '민수 빼기', disabled);
    await onMarkCard(user, '나 · 3분', '다른 건물에서 출발', disabled);
    expect(mapThings()).toContain(PICK);
    await pass(HELD_MS);

    expect(recalculations(server)).toEqual([WITH_MIN_JUN]);
    expect(mapThings()).toContain(PICK_FOR_THREE);
    await onMarkCard(user, '지은 · 5분', '지은 빼기', enabled);
  });

  it('moves the camera once when the answer is applied, after the card is laid out again', async () => {
    const fit = jest.spyOn(projection, 'fit');
    await pickMinJun(false);
    await layAnswerCard(380);
    const before = fit.mock.calls.length;

    await pass(HELD_MS);
    // The phone lays the card out again for the new answer: the plain ground lays nothing out.
    await layAnswerCard(240);
    await pass(1000);

    expect(fit.mock.calls).toHaveLength(before + 1);
  });

  it("lights the face of a Friend the answer's Plan holds", async () => {
    const user = await ask();
    server.on('POST /assistant/answers', { status: 200, body: { ...MEAL_ANSWER, input: WITH_MIN_JUN.input } });
    await press(user, MIN_JUN.name);

    await user.press(pickDone());
    await pass(500);

    expect(recalculations(server)).toEqual([WITH_MIN_JUN]);
    expect(lookOf(MIN_JUN.name)).toMatch(LIT);
    expect(timeBar().getByRole('button', { name: ADD })).toBeEnabled();
  });
});

// Partitions: a refusal of the main server.
describe('a failed 완료', () => {
  it('says so, keeps the Plan as it was, and puts the + back on the face', async () => {
    server.on('POST /assistant/answers', refusal(500));
    const user = await ask();
    await press(user, MIN_JUN.name);

    await user.press(pickDone());
    await pass(500);

    expect(within(screen.getByTestId('toast-layer')).getByText(NOT_RECALCULATED)).toBeVisible();
    expect(mapThings()).toContain(PICK);
    expect(lookOf(MIN_JUN.name)).toMatch(ADDABLE);
    await onMarkCard(user, '민수', '민수 빼기', enabled);
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The card of a Plan (P02 ticket 02, "The Plan in the card"): its lines, "근거", and the arrows with the count, and a
// press on a candidate's mark, over the stored answer to "배고파, 민수랑 같이", whose five Plans are 302동식당,
// 301동식당, 학생회관식당, 3식당, and 자하연식당 2층.

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

// Partitions: the first Plan; forward twice; back from the first.
describe('the arrows and the count', () => {
  it('show the first Plan as 1/5', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(card().getByText('12:15 302동식당')).toBeVisible();
    expect(card().getByText('1/5')).toBeVisible();
    expect(card().getByRole('button', { name: BEFORE })).toBeVisible();
    expect(card().getByRole('button', { name: NEXT })).toBeVisible();
  });

  it('go to the third Plan with "›" twice, and the map draws it', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: NEXT }));
    await user.press(card().getByRole('button', { name: NEXT }));

    expect(card().getByText('12:33 학생회관식당')).toBeVisible();
    expect(card().getByText('3/5')).toBeVisible();
    expect(screen.getByLabelText('12:18 민수와 만남')).toBeOnTheScreen();
    expect(screen.getByLabelText('민수 · 18분')).toBeOnTheScreen();
    expect(screen.queryByLabelText('나 · 3분')).toBeNull();
  });

  it('go round to the last Plan with "‹" from the first', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: BEFORE }));

    expect(card().getByText('5/5')).toBeVisible();
  });
});

// Partitions: a press on a candidate's mark; an answer of one Plan.
describe('the other ways through the Plans', () => {
  it("show a candidate's Plan when its mark is pressed", async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await press(user, '후보 3 · 학생회관식당');

    expect(card().getByText('12:33 학생회관식당')).toBeVisible();
    expect(card().getByText('3/5')).toBeVisible();
  });

  it('show no arrows for an answer of one Plan', async () => {
    expect(MEAL_ANSWER_ALONE.plans.length).toBeGreaterThan(0);
    // The stored answer for the User alone, with this one field changed: its first Plan alone.
    const answer = { ...MEAL_ANSWER_ALONE, plans: MEAL_ANSWER_ALONE.plans.slice(0, 1) };

    await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer });

    expect(card().queryByRole('button', { name: NEXT })).toBeNull();
    expect(card().queryByText('1/1')).toBeNull();
  });
});

// Partitions: closed at first, opened, closed again, and closed by a change of the Plan.
describe('the basis', () => {
  it('is closed at first, and "근거" opens it', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    expect(card().queryByText(FIRST_BASIS[0] ?? '')).toBeNull();

    await user.press(card().getByRole('button', { name: '근거' }));

    for (const line of FIRST_BASIS) {
      expect(card().getByText(line)).toBeVisible();
    }
    expect(card().getByRole('button', { name: '근거 접기' })).toBeVisible();
  });

  it('closes with "근거 접기"', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(card().getByRole('button', { name: '근거' }));

    await user.press(card().getByRole('button', { name: '근거 접기' }));

    expect(card().queryByText(FIRST_BASIS[0] ?? '')).toBeNull();
    expect(card().getByRole('button', { name: '근거' })).toBeVisible();
  });

  it('closes when the Plan on screen changes', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(card().getByRole('button', { name: '근거' }));

    await user.press(card().getByRole('button', { name: NEXT }));

    expect(card().getByRole('button', { name: '근거' })).toBeVisible();
    expect(card().queryByText(/걸어서/u)).toBeNull();
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, MIN_JUN, PHONE_NOW } from './support/server';

// Correcting who eats together (P02 ticket 03, "Taking a Friend out" and "Adding a Friend"), over the stored answer
// to "배고파, 민수랑 같이" and the fake main server's Friends, 김민준, whom the User sees on the map, and 서지우, whom
// the User cannot see. Without the app's own statuses the Friend list says 공강 and 위치 꺼짐 of them (the friend
// adapter's rule).

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

const ASKER = MEAL_ANSWER.input.people[0];
const ADD = '같이 먹을 친구 추가';

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

// Partitions: the ✕ of a person's chip.
describe('taking a Friend out', () => {
  it('sends the conditions without 민수 and draws the answer that comes back', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_ALONE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: '민수 빼기' }));
    await pass(500);

    expect(recalculations(server)).toEqual([{ input: { ...MEAL_ANSWER.input, people: [ASKER] }, location: ON_CAMPUS }]);
    // Who eats changed, so the first Plan of the answer for the User alone is shown.
    expect(card().getByText('301동식당')).toBeVisible();
    expect(card().getByText('12:45엔 나서야 해요')).toBeVisible();
    expect(card().getByText('1/5')).toBeVisible();
    expect(card().getByRole('button', { name: '301동에서' })).toBeVisible();
    expect(card().queryByRole('button', { name: '민수 빼기' })).toBeNull();
    expect(mapThings()).not.toContain('민수');
  });
});

// Partitions: the list opened and closed; a Friend already in the Plan.
describe('adding a Friend', () => {
  it("lists the User's Friends with the Friend list's lines, and 닫기 closes the list", async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: ADD }));

    expect(card().getByRole('button', { name: `${MIN_JUN.name} 추가` })).toHaveTextContent('김민준 · 공강');
    expect(card().getByRole('button', { name: `${JI_WOO.name} 추가` })).toHaveTextContent('서지우 · 위치 꺼짐');
    await user.press(card().getByRole('button', { name: '닫기' }));
    expect(card().queryByRole('button', { name: `${MIN_JUN.name} 추가` })).toBeNull();
  });

  it('leaves out a Friend who is in the Plan', async () => {
    // The stored answer with its second person's user id changed to 김민준's, a Friend of the fake server.
    const input = { ...MEAL_ANSWER.input, people: [ASKER, { userId: MIN_JUN.id, constraints: [] }] };
    const user = await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER, input } });

    await user.press(card().getByRole('button', { name: ADD }));

    expect(card().queryByRole('button', { name: `${MIN_JUN.name} 추가` })).toBeNull();
    expect(card().getByRole('button', { name: `${JI_WOO.name} 추가` })).toBeVisible();
  });
});

// Partitions: a Friend chosen from the list and from the map; the Avatar of a Friend whom the conditions hold.
describe('adding a Friend chosen', () => {
  it('sends the conditions with the Friend chosen, without constraints, and draws the answer for three', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(card().getByRole('button', { name: ADD }));

    await user.press(card().getByRole('button', { name: `${JI_WOO.name} 추가` }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { ...MEAL_ANSWER.input, people: [...MEAL_ANSWER.input.people, { userId: JI_WOO.id, constraints: [] }] },
        location: ON_CAMPUS,
      },
    ]);
    expect(card().getByText('12:33 학생회관식당')).toBeVisible();
    expect(card().getByRole('button', { name: '민수 빼기' })).toBeVisible();
    expect(card().getByRole('button', { name: '지은 빼기' })).toBeVisible();
  });

  it("sends the same for a press on the Friend's Avatar on the map", async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await press(user, MIN_JUN.name);
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { ...MEAL_ANSWER.input, people: [...MEAL_ANSWER.input.people, { userId: MIN_JUN.id, constraints: [] }] },
        location: ON_CAMPUS,
      },
    ]);
    expect(card().getByText('12:33 학생회관식당')).toBeVisible();
  });

  it('takes no press on the Avatar of a Friend whom the conditions hold', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE });
    // The stored answer with its second person's user id changed to 김민준's, whose Avatar the scene does not hide.
    const input = { ...MEAL_ANSWER.input, people: [ASKER, { userId: MIN_JUN.id, constraints: [] }] };
    const user = await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER, input } });

    await press(user, MIN_JUN.name);
    await pass(500);

    expect(recalculations(server)).toEqual([]);
    expect(screen.getByTestId('answer-card')).toBeVisible();
  });
});

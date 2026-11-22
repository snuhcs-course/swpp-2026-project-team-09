/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, mapLines, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { givePhone, ON_CAMPUS } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// The other candidates as tags while a meal answer is up (P04 ticket 13, boards 20 to 22): each keeps its number, its
// name, its arrival time, and its dishes with their price; a press on one makes it the pick, and the old pick becomes
// a tag; only the pick's own routes are drawn.

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

const PICK = '302동식당 · 12:15 · 걸음 20분 · 뼈없는감자탕 외 5 · 4,000원부터';
const CANDIDATES = [
  '후보 2 · 301동식당 · 걸음 15분',
  '후보 3 · 학생회관식당 · 걸음 16분',
  '후보 4 · 3식당 · 걸음 19분',
  '후보 5 · 자하연식당 2층 · 걸음 22분',
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

// Partitions: the first Plan on screen; a candidate pressed.
describe('a meal answer with five Plans and their menus', () => {
  it('shows the pick with its time, walking, first dish, and price, and candidates 2 to 5 as tags of their walking', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    expect(screen.getByRole('button', { name: PICK })).toBeOnTheScreen();
    for (const name of CANDIDATES) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }
    expect(screen.queryByText(/\d+\/5/u)).toBeNull();
  });

  it("draws the pick's own routes alone: the User's walk whole and the way on to the next Class as dots", async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    const [walk, ...dots] = mapLines();
    expect(walk).toBe('answer:route:0');
    expect(dots.length).toBeGreaterThan(0);
    expect(dots.every((id) => id.startsWith('answer:route:1:dot:'))).toBe(true);
  });

  it('makes candidate 2 the pick on a press, and the old pick candidate 1', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await press(user, CANDIDATES[0] ?? '');

    expect(
      screen.getByRole('button', { name: /^301동식당 · 12:18 · 걸음 15분 · 부대짬뽕&군만두 외 4/u }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '후보 1 · 302동식당 · 걸음 20분' })).toBeOnTheScreen();
    expect(mapThings().filter((name) => name.startsWith('후보 '))).toHaveLength(4);
  });
});

// The stored answer with 3식당 moved onto 자하연식당 2층's point, two restaurants of one building.
function withOneBuilding(answer: AnswerReply): AnswerReply {
  const other = answer.plans.find(({ place }) => place.label === '자하연식당 2층')?.place;
  if (other === undefined) {
    throw new Error('The stored answer has no 자하연식당 2층');
  }
  const moved = (place: Plan['place']): Plan['place'] =>
    place.label === '3식당' ? { ...place, latitude: other.latitude, longitude: other.longitude } : place;
  const plans = answer.plans.map((plan) => ({
    ...plan,
    place: moved(plan.place),
    scene: { ...plan.scene, places: plan.scene.places.map((item) => ({ ...item, place: moved(item.place) })) },
  }));
  return { ...answer, plans };
}

// Partitions: two candidates at one point, each pressed.
describe('two candidates in one building', () => {
  const reply = { ...MEAL_ANSWER_MENUS_REPLY, answer: withOneBuilding(MEAL_ANSWER_MENUS_REPLY.answer) };

  it('picks each by a press on its own tag', async () => {
    const user = await askOnMap(server, reply);

    await press(user, CANDIDATES[2] ?? '');
    expect(screen.getByRole('button', { name: /^3식당 · .*치즈한장부대찌개 외 2/u })).toBeOnTheScreen();

    await press(user, '후보 5 · 자하연식당 2층 · 걸음 22분');
    expect(screen.getByRole('button', { name: /^자하연식당 2층 · 12:35/u })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^후보 4 · 3식당/u })).toBeOnTheScreen();
  });
});

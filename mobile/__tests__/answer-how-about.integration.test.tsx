/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER_FIXED_PLACE, MEAL_ANSWER_THREE, MEAL_ANSWER_UNFIT_PLACE } from '@/api/mock/data/meal-answers';
import type { Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, mapLines, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { holdBackButton } from './support/back';
import { tapGround } from './support/building';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// "여기면 어때?" (P02 ticket 26) against the fake main server: the stored answer to "배고파" with 민수 and 지은 (its first
// Plan 학생회관식당 12:33–12:55, 22 minutes together) on screen, and a building pressed over it, which the main server
// answers with its real replies of boards a7 (자하연식당 fits) and a8 (301동식당 does not). The Plan on screen is read
// from the pick's flag (P04 ticket 04).

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

const REPLY = {
  text: '12:33 학생회관식당에서 같이 먹어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: MEAL_ANSWER_THREE,
  lookup: null,
};

// The Places of the stored replies' fixed `placeId`, at the points of their Restaurants.
const JAHAYEON: Place = {
  id: 'b56be928-cbfe-5c4b-aaa1-40171ba126d1',
  number: null,
  name: '자하연식당',
  latitude: 37.46098,
  longitude: 126.95252,
};
const ENGINEERING_1: Place = {
  id: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
  number: '301',
  name: '제1공학관',
  latitude: 37.45016,
  longitude: 126.95259,
};

let server: FakeServer;
let back: () => Promise<boolean>;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  back = holdBackButton();
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof askOnMap>>;

// The answer on screen, and a press on the ground where the main server finds `place`, which it answers with `body`.
async function pressOver(place: Place, body: object): Promise<User> {
  const user = await askOnMap(server, REPLY);
  server.on('GET /places/at', { status: 200, body: { place, relation: 'inside' } });
  server.on('POST /assistant/answers', { status: 200, body });
  await tapGround();
  await pass(500);
  return user;
}

function rows(): string[] {
  return within(screen.getByTestId('how-about-rows'))
    .getAllByTestId('how-about-row')
    .map((row) =>
      within(row)
        .getAllByText(/./u)
        .map((part): unknown => part.props.children)
        .join(' '),
    );
}

// Partitions: the card while its answer is on its way.
describe('a pressed Place while it is asked', () => {
  it('waits with the dots, labelled "보는 중이에요", until the answer comes', async () => {
    await askOnMap(server, REPLY);
    server.on('GET /places/at', { status: 200, body: { place: JAHAYEON, relation: 'inside' } });
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_FIXED_PLACE, afterMs: 1000 });
    await tapGround();
    await pass(100);

    expect(screen.getByText('여기면 어때?')).toBeVisible();
    expect(card().getByLabelText('보는 중이에요')).toBeVisible();
    expect(card().queryByText('보는 중이에요')).toBeNull();
    await pass(1000);
    expect(card().queryByLabelText('보는 중이에요')).toBeNull();
  });
});

// Partitions: a Place that fits, its request, its card, its map, and "여기로 바꾸기". Expected values: board a7.
describe('a pressed Place that fits (a7)', () => {
  it('asks with the conditions on screen and only the Place changed', async () => {
    await pressOver(JAHAYEON, MEAL_ANSWER_FIXED_PLACE);

    expect(recalculations(server)).toEqual([
      expect.objectContaining({ input: { ...MEAL_ANSWER_THREE.input, placeId: JAHAYEON.id }, location: ON_CAMPUS }),
    ]);
  });

  it('shows each arrival, the time together against the Plan on screen, and the two buttons', async () => {
    await pressOver(JAHAYEON, MEAL_ANSWER_FIXED_PLACE);

    expect(screen.getByText('여기면 어때?')).toBeVisible();
    expect(card().getByRole('header', { name: '자하연식당 2층' })).toBeVisible();
    expect(rows()).toEqual(['나 12:35 도착', '민수 12:35 도착', '지은 12:18 도착']);
    expect(card().getByText('12:35–12:55 함께 20분 · 지금 계획보다 2분 짧아요')).toBeVisible();
    expect(card().getByRole('button', { name: '여기로 바꾸기' })).toBeVisible();
    expect(card().getByRole('button', { name: '그대로' })).toBeVisible();
    expect(within(screen.getByTestId('answer-caption')).getByText('자하연식당 2층')).toBeVisible();
  });

  it('draws the Plan on screen as "지금 계획", each line to the pressed Place, and the User\'s line to the Plan faded', async () => {
    await pressOver(JAHAYEON, MEAL_ANSWER_FIXED_PLACE);

    expect(mapThings()).toEqual(expect.arrayContaining(['지금 계획 · 학생회관식당', '자하연식당']));
    expect(mapLines()).toEqual(['answer:route:0', 'answer:route:1', 'answer:route:2', 'answer:route:3']);
  });

  it('"여기로 바꾸기" puts the answer for the Place on screen', async () => {
    const user = await pressOver(JAHAYEON, MEAL_ANSWER_FIXED_PLACE);

    await user.press(card().getByRole('button', { name: '여기로 바꾸기' }));
    await pass(500);

    expect(screen.queryByText('여기면 어때?')).toBeNull();
    expect(mapThings()).toContain('자하연식당 2층 · 12:35 점심');
    expect(recalculations(server)).toHaveLength(2);
  });
});

// Partitions: a Place that does not fit. Expected values: board a8.
describe('a pressed Place that does not fit (a8)', () => {
  it('shows the rows of the dropped Place, the server\'s two lines, and "그대로" alone', async () => {
    await pressOver(ENGINEERING_1, MEAL_ANSWER_UNFIT_PLACE);

    expect(card().getByRole('header', { name: '301동식당' })).toBeVisible();
    expect(rows()).toEqual(['나 지금 여기 있어요', '민수 12:18 도착', '지은 12:31 도착']);
    expect(card().getByText('지은은 12:31에 도착해 13분만 먹어요')).toBeVisible();
    expect(card().getByText('13:00 수업에 가려면 12:44엔 나서야 해요')).toBeVisible();
    expect(card().queryByRole('button', { name: '여기로 바꾸기' })).toBeNull();
    expect(card().getByRole('button', { name: '그대로' })).toBeVisible();
  });
});

// The Plan on screen as it was before the press, and no other request.
async function expectPlanBack(): Promise<void> {
  await pass(500);
  expect(screen.queryByText('여기면 어때?')).toBeNull();
  expect(mapThings()).toContain('학생회관식당 · 12:33 점심');
  expect(within(screen.getByTestId('answer-caption')).queryByText('자하연식당 2층')).toBeNull();
  expect(recalculations(server)).toHaveLength(1);
}

// Partitions: "그대로", the pill's ✕, and Android's back. Expected values: the Plan on screen as it was, with no
// request.
describe('the ways back to the Plan on screen', () => {
  it('"그대로" returns to it', async () => {
    const user = await pressOver(JAHAYEON, MEAL_ANSWER_FIXED_PLACE);

    await user.press(card().getByRole('button', { name: '그대로' }));

    await expectPlanBack();
  });

  it("the pill's ✕ returns to it, keeping the conversation", async () => {
    const user = await pressOver(JAHAYEON, MEAL_ANSWER_FIXED_PLACE);

    await user.press(screen.getByRole('button', { name: '답 닫기' }));

    await expectPlanBack();
  });

  it("Android's back returns to it", async () => {
    await pressOver(JAHAYEON, MEAL_ANSWER_FIXED_PLACE);

    await expect(back()).resolves.toBe(true);

    await expectPlanBack();
  });
});

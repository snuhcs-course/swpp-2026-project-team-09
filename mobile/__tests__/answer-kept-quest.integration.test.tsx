/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { AssistantReply, KeptQuest } from '@/api/assistant-types';
import type { Place } from '@/api/types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, mapThings } from './support/answer-map';
import { tapGround } from './support/building';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 20: the place of a Quest already set marked on the map apart from the candidates, and 그대로 두기 that
// leaves it as the only mark. Over the stored answer to "배고파" for the User alone, whose candidate 4 is 302동식당, and
// the stored meet answer. Expected values: the tag and the line as the ticket gives them.

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

const LUNCH: KeptQuest = {
  kind: 'meal-lunch',
  questId: 'q-lunch',
  title: '302동식당에서 점심',
  startAt: '2026-11-17T12:16:00+09:00',
  endAt: null,
  place: '302동식당',
  point: {
    placeId: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
    label: '302동식당',
    latitude: 37.44887,
    longitude: 126.95265,
  },
  people: [],
  mine: true,
  changeable: true,
};
const LUNCH_REPLY: AssistantReply = {
  ...MEAL_ANSWER_REPLY,
  text: '이미 12:16 302동식당 점심이 있어요. 바꿀까요?',
  answer: { ...MEAL_ANSWER_ALONE, planSet: LUNCH },
};
const MEETING: KeptQuest = {
  ...LUNCH,
  kind: 'meet',
  questId: 'q-meeting',
  title: '민수와 만나기',
  startAt: '2026-11-17T15:00:00+09:00',
  place: '관정도서관',
  point: { placeId: 'kwanjeong', label: '관정도서관', latitude: 37.45965, longitude: 126.95168 },
  people: [{ name: '민수', answer: 'accepted' }],
};
const MEET_REPLY: AssistantReply = {
  ...MEAL_ANSWER_REPLY,
  text: '이미 15:00 관정도서관에서 민수와 약속이 있어요. 바꿀까요?',
  answer: { ...MEET_ANSWER, planSet: MEETING },
};

// The building of the lunch's own candidate, which a tap on the ground finds.
const ENGINEERING_1: Place = {
  id: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
  number: '301',
  name: '제1공학관',
  latitude: 37.45016,
  longitude: 126.95259,
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

function dock(): ReturnType<typeof within> {
  return within(screen.getByTestId('dock-row'));
}

// Partitions: the answer as it comes; 그대로 두기 pressed.
describe('a lunch already set, on the map', () => {
  it("is marked at its place with 잡힌 점심 12:16, beside candidate 4's own mark", async () => {
    await askOnMap(server, LUNCH_REPLY);

    expect(mapThings()).toEqual(expect.arrayContaining(['잡힌 점심 12:16', '후보 4 · 302동식당']));
  });

  it("is the only mark beside the User's own once 그대로 두기 leaves it, with the line, and nothing is sent", async () => {
    const user = await askOnMap(server, LUNCH_REPLY);

    await user.press(dock().getByRole('button', { name: '그대로 두기' }));
    await pass(300);

    expect(screen.getByTestId('answer-card')).toBeVisible();
    expect(mapThings()).toEqual(['나', '잡힌 점심 12:16']);
    expect(dock().getByText('12:16 302동식당 점심을 그대로 뒀어요')).toBeVisible();
    expect(screen.queryByRole('button', { name: '그대로 두기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '바꾸기' })).toBeNull();
    expect(screen.queryByTestId('time-bar')).toBeNull();
    expect(server.received('POST /plans')).toHaveLength(0);
  });
});

// Partitions: before and after 바꾸기 of a meeting kept apart from every candidate.
describe('a meeting already set, on the map', () => {
  it("is marked at its own place with 잡힌 약속 15:00, and the Plan's Friend stays drawn", async () => {
    await askOnMap(server, MEET_REPLY);

    expect(mapThings()).toEqual(expect.arrayContaining(['잡힌 약속 15:00', '민수']));
  });

  it('is no longer marked once 바꾸기 changed it', async () => {
    server.on(`PUT /plans/${MEETING.questId}`, { status: 200, body: PLAN_QUEST.quest });
    const user = await askOnMap(server, MEET_REPLY);

    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(mapThings().filter((name) => name.startsWith('잡힌'))).toEqual([]);
  });
});

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

// Partitions: 그대로 두기 while a meal's 바꾸기 is on its way. From PR 444's review: the choice beside a Quest already set
// waits for 바꾸기's reply, and a Plan made wins the map.
describe('그대로 두기 while 바꾸기 is on its way', () => {
  it('takes no press, and the Plan made is drawn once it comes', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST, afterMs: 3000 });
    const user = await askOnMap(server, LUNCH_REPLY);

    await user.press(beside().getByRole('button', { name: '바꾸기' }));
    await pass(300);
    expect(dock().getByRole('button', { name: '그대로 두기' })).toBeDisabled();
    await pass(3500);

    expect(mapThings().filter((name) => name.startsWith('잡힌'))).toEqual([]);
    expect(mapThings().some((name) => name.startsWith('301동식당'))).toBe(true);
  });
});

// Partitions: a building tapped, 나 pressed, the dock's line pressed, after 그대로 두기. From PR 444's review: the Quest
// left as it is is settled, as a Plan made is, and a new message is the way on.
describe('the answer after 그대로 두기', () => {
  it('asks nothing of a building tapped', async () => {
    const user = await askOnMap(server, LUNCH_REPLY);
    await user.press(dock().getByRole('button', { name: '그대로 두기' }));
    await pass(300);
    server.on('GET /places/at', { status: 200, body: { place: ENGINEERING_1, relation: 'inside' } });

    await tapGround();

    expect(screen.queryByText('여기면 어때?')).toBeNull();
    expect(server.received('POST /assistant/answers')).toHaveLength(0);
  });

  it('draws 나 as no button, and its line raises nothing', async () => {
    const user = await askOnMap(server, LUNCH_REPLY);
    await user.press(dock().getByRole('button', { name: '그대로 두기' }));
    await pass(300);

    expect(within(screen.getByTestId('main-map-touches')).queryByRole('button', { name: '나' })).toBeNull();
    expect(screen.queryByTestId('mark-card')).toBeNull();
    expect(dock().queryByRole('button', { name: /그대로 뒀어요/u })).toBeNull();
    expect(dock().queryByText('›')).toBeNull();
    expect(mapThings()).toEqual(['나', '잡힌 점심 12:16']);
  });
});

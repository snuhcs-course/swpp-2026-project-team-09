/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import type { Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { tapGround } from './support/building';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// A building pressed while a meal's Plan is on screen (P04 ticket 66, which removed "여기면 어때?"), against the fake
// main server: the stored answer to "배고파" with 민수 and 지은 on screen, and a press on the ground where the main
// server finds 제1공학관, none of the answer's marks.

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

// Partitions: a building that is none of the answer's marks, pressed once.
describe('a building pressed during a meal’s Plan', () => {
  it('asks nothing and leaves the answer, its map, and its caption as they were', async () => {
    await askOnMap(server, REPLY);
    const drawn = mapThings();
    const caption = screen.getByTestId('answer-caption').props.accessibilityLabel as unknown;
    server.on('GET /places/at', { status: 200, body: { place: ENGINEERING_1, relation: 'inside' } });

    await tapGround();
    await pass(500);

    expect(recalculations(server)).toEqual([]);
    expect(server.received('POST /assistant/answers')).toHaveLength(0);
    expect(mapThings()).toEqual(drawn);
    expect(screen.getByTestId('answer-caption')).toHaveProp('accessibilityLabel', caption);
    expect(screen.queryByText('여기면 어때?')).toBeNull();
  });
});

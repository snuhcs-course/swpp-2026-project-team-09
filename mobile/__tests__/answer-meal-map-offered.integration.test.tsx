/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { crowdedMealReply, crowdedWithFriend } from '@/api/mock/data/crowded-meal';
import { FRIENDS } from '@/api/mock/data/friends';
import { koreaDateKey, koreaNextDay } from '@/korea-time';
import { raiseCard } from './support/card-grip';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// P04 ticket 71, the user's word of 2026-11-26 ("B로 진행해줘"): the map shows the places that can be done only, the
// numbered Plans, 1 to n, as the list numbers them. A place the main server dropped for the time, a Plan the phone
// fades, and a Restaurant closed for the meal draw nothing on the map. Expected values: the crowded answer of
// tomorrow, whose 기숙사식당 cannot be done before the Class at 15:30, alone and with a Friend, who leaves 302동식당 and
// drops the other ten.

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

const DATE = koreaDateKey(koreaNextDay(PHONE_NOW));
const NOW = PHONE_NOW.toISOString();
const [FRIEND] = FRIENDS;
const CLOSED = '감골식당';

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

// The candidates' numbers on the map ("후보 3 · …"), the pick's number 1 among them.
function mapNumbers(): number[] {
  const numbers = mapThings().flatMap((name) => {
    const found = /^후보 (\d+) · /u.exec(name);
    return found === null ? [] : [Number(found[1])];
  });
  return [1, ...numbers].toSorted((one, other) => one - other);
}

// Partitions: a Plan the phone fades; places the main server dropped beside a Restaurant closed for the meal.
describe('the map of a meal answer', () => {
  it('draws no Plan that cannot be done, and numbers the rest 1 to n as the list does', async () => {
    await askOnMap(server, crowdedMealReply(DATE, NOW));

    await raiseCard();

    const rows = within(screen.getByTestId('meal-list')).getAllByRole('button', { name: /^\d+ /u });
    expect(mapNumbers()).toEqual(rows.map((_row, index) => index + 1));
    expect(mapThings().some((name) => name.includes('기숙사식당'))).toBe(false);
  });

  it('draws nothing of the places dropped for the time nor of a Restaurant closed for the meal', async () => {
    const answer = crowdedWithFriend(DATE, NOW, FRIEND?.id ?? '');
    const [kept] = answer.plans;
    const place = {
      ...(kept?.place ?? { placeId: 'p', latitude: 37.46, longitude: 126.95 }),
      placeId: 'closed',
      label: CLOSED,
    };
    const closed: AnswerReply = { ...answer, closed: [{ place, notices: ['정전으로 휴점합니다'] }] };
    expect(answer.plans.flatMap(({ scene }) => scene.places).some(({ role }) => role === 'dropped')).toBe(true);

    await askOnMap(server, { ...crowdedMealReply(DATE, NOW), answer: closed });

    expect(mapThings().filter((name) => /밖에 못 있어요|뿐이에요|휴점/u.test(name))).toEqual([]);
    expect(mapNumbers()).toEqual([1]);
  });
});

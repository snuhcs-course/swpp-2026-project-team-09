/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { apiClient } from '@/api/client';
import { pass, screen } from './support/app';
import { mapLines } from './support/answer-map';
import { STUDENT_HALL, tapGround, touchAndLift } from './support/building';
import { givePhone, NEAR_LIBRARY, ON_CAMPUS, openMain } from './support/main';
import { DINNER, press } from './support/markers';
import { startFresh, withoutInterestMarks } from './support/mocks';

// A tap on empty map clears the walking route (P15 ticket 55), over the mocks: a tap that no mark keeps and where no
// Place is found, or the main server cannot answer, drops the line, whether a "길찾기" drew it or the screen drew it by
// itself when it opened. A mark's press and a tap that opens a Place's card leave it.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const LINE = 'walking-route';

let findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');
let findPlaceAt = jest.spyOn(apiClient, 'findPlaceAt');

beforeEach(async () => {
  jest.useFakeTimers();
  findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');
  findPlaceAt = jest.spyOn(apiClient, 'findPlaceAt').mockResolvedValue({ place: null, relation: 'none' });
  await startFresh();
  withoutInterestMarks();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

type User = Awaited<ReturnType<typeof openMain>>;

// The screen opened on campus, with the route to the next Quest drawn by itself.
async function openWithRoute(): Promise<User> {
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  const user = await openMain();
  await pass(500);
  expect(mapLines()).toContain(LINE);
  return user;
}

// Partitions: the route a "길찾기" drew and the one drawn by itself; no Place found, and no answer.
describe('a tap on empty map', () => {
  it('clears the route a "길찾기" on a card drew', async () => {
    const user = await openWithRoute();
    await press(user, DINNER);
    await press(user, '길찾기');
    await pass(500);
    expect(mapLines()).toContain(LINE);

    await tapGround();

    expect(mapLines()).not.toContain(LINE);
    expect(screen.queryByTestId('map-card')).toBeNull();
  });

  it('clears the route drawn by itself, which does not come back with a new position', async () => {
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();
    await pass(500);
    expect(mapLines()).toContain(LINE);

    await tapGround();
    await phone.moveTo(NEAR_LIBRARY);
    await pass(500);

    expect(mapLines()).not.toContain(LINE);
    expect(findWalkingRoute).toHaveBeenCalledTimes(1);
  });

  it('clears the route when the main server cannot say what is there', async () => {
    findPlaceAt.mockRejectedValue(new TypeError('Network request failed'));
    await openWithRoute();

    await tapGround();

    expect(mapLines()).not.toContain(LINE);
  });

  it('lets a "길찾기" draw a route again after it', async () => {
    const user = await openWithRoute();
    await tapGround();

    await press(user, DINNER);
    await press(user, '길찾기');
    await pass(500);

    expect(mapLines()).toContain(LINE);
  });
});

// Partitions: a mark's press that comes with the touch; a tap on a building.
describe('a tap that is not on empty map', () => {
  it("is a mark's press, which opens its card and leaves the route", async () => {
    const user = await openWithRoute();

    await touchAndLift();
    await press(user, DINNER);
    await pass(500);

    expect(findPlaceAt).not.toHaveBeenCalled();
    expect(screen.getByTestId('map-card')).toBeVisible();
    expect(mapLines()).toContain(LINE);
  });

  it("is on a building, which opens the Place's card and leaves the route", async () => {
    findPlaceAt.mockResolvedValue({ place: STUDENT_HALL, relation: 'inside' });
    await openWithRoute();

    await tapGround();

    expect(screen.getByTestId('map-card')).toBeVisible();
    expect(mapLines()).toContain(LINE);
  });
});

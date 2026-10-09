// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by AhnJinYoung
import * as Location from 'expo-location';
import { Animated } from 'react-native';
import { pass, screen } from './support/app';
import { EXPLANATION, givePhone, ME, NEAR_LIBRARY, OFF_CAMPUS, ON_CAMPUS, openMain, placeOf } from './support/main';
import { startFresh } from './support/mocks';
import { walksOnCampus } from '@/dev-settings';
import { CAMPUS_BOUNDS, isInside } from '@/map';
import { WALK } from '@/position/walk';

jest.mock('expo-location');
// A phone that does not ask for less motion: the Avatar glides.
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => false,
  useMotionAllowed: (): boolean => true,
  useReduceMotionSetting: (): boolean => false,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("the User's Avatar on the move", () => {
  it('glides to each new position over the time it took to come, between one and five seconds', async () => {
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();
    const glides = jest.spyOn(Animated, 'timing');
    const durations = (): unknown[] => glides.mock.calls.map(([, { duration }]) => duration);

    // A phone that tells a position every two seconds.
    await pass(2000);
    await phone.moveTo(NEAR_LIBRARY);
    await pass(2000);
    await phone.moveTo(ON_CAMPUS);
    expect(durations()).toEqual([expect.any(Number), 2000]);

    // Sooner than a second, and later than five.
    await pass(300);
    await phone.moveTo(NEAR_LIBRARY);
    await pass(20_000);
    await phone.moveTo(ON_CAMPUS);
    expect(durations().slice(2)).toEqual([1000, 5000]);
  });
});

describe('the development walk on campus', () => {
  it("replaces the phone's position, with no question and no prompt", async () => {
    process.env.EXPO_PUBLIC_CAMPUS_WALK = '1';
    givePhone({ permission: 'unasked', position: OFF_CAMPUS });
    await openMain();

    expect(screen.queryByText(EXPLANATION)).toBeNull();
    expect(screen.getByRole('image', { name: ME })).toBeVisible();
    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  });

  it('takes a step along its path every five seconds, and the Avatar glides there', async () => {
    process.env.EXPO_PUBLIC_CAMPUS_WALK = '1';
    givePhone({ permission: 'unasked' });
    await openMain();
    const glides = jest.spyOn(Animated, 'timing');
    const before = placeOf(ME);

    await pass(5000);

    expect(placeOf(ME)).not.toEqual(before);
    expect(glides).toHaveBeenCalledTimes(1);
    await pass(5000);
    expect(glides).toHaveBeenCalledTimes(2);
  });

  it('stays on campus, and ends where it starts', () => {
    expect(WALK.length).toBeGreaterThan(3);
    expect(WALK.every((position) => isInside(position, CAMPUS_BOUNDS))).toBe(true);
    expect(WALK[0]).toEqual(ON_CAMPUS);
  });

  it('is off in a released app', () => {
    process.env.EXPO_PUBLIC_CAMPUS_WALK = '1';
    const development = __DEV__;
    Object.assign(globalThis, { __DEV__: false });
    try {
      expect(walksOnCampus()).toBe(false);
    } finally {
      Object.assign(globalThis, { __DEV__: development });
    }
  });
});

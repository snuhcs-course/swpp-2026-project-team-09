/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, startApp } from './support/app';
import {
  answerFirstRun,
  cardsShown,
  finishOnboarding,
  type Held,
  interestOf,
  later,
  OPERATING_SYSTEMS,
  TIMETABLE,
  type User,
} from './support/first-run';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// The tour of the bottom tabs after Onboarding (P06 ticket 07, HE H7 and H8), against the fake main server: it waits
// for the first run, steps through the four tabs, is skipped for now or turned off for good, and replays from 내 정보.

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

let server: FakeServer;
let held: Held;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  held = answerFirstRun(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function restart(): Promise<void> {
  await screen.unmount();
  await startApp();
  await pass(1000);
  await pass(500);
}

const TITLES = ['지도', '파티', '행사', '내 정보'];

// The title of the tour's step on screen, or null without the tour.
function stepShown(): string | null {
  const tour = screen.queryByTestId('tab-tour');
  return tour === null ? null : (TITLES.find((name) => within(tour).queryByRole('header', { name }) !== null) ?? null);
}

async function press(user: User, name: string): Promise<void> {
  await user.press(within(screen.getByTestId('tab-tour')).getByRole('button', { name }));
  await pass(500);
}

// A new User who already has what the first run asks for, so that no card waits before the tour.
function finishOnboardingWithAll(): Promise<User> {
  held.classes = [OPERATING_SYSTEMS];
  held.interests = [interestOf('채용', 0)];
  held.friends = [MIN_JUN];
  return finishOnboarding();
}

describe('the tour after Onboarding', () => {
  it('waits for the first run, then points at the four tabs one at a time', async () => {
    const user = await finishOnboarding();
    expect(cardsShown()).toEqual([TIMETABLE]);
    expect(stepShown()).toBeNull();

    await later(user);
    await later(user);
    expect(stepShown()).toBeNull();
    await later(user);
    expect(cardsShown()).toEqual([]);

    expect(stepShown()).toBe('지도');
    expect(screen.getByText('1/4')).toBeVisible();
    await press(user, '다음');
    expect(stepShown()).toBe('파티');
    await press(user, '다음');
    expect(stepShown()).toBe('행사');
    await press(user, '다음');
    expect(stepShown()).toBe('내 정보');
    expect(screen.getByText('4/4')).toBeVisible();
    await press(user, '완료');
    expect(stepShown()).toBeNull();

    await restart();
    expect(stepShown()).toBeNull();
  });

  it('shows at once when the first run asks nothing', async () => {
    await finishOnboardingWithAll();

    expect(cardsShown()).toEqual([]);
    expect(stepShown()).toBe('지도');
  });

  it('lights only the tab of its step, in the tab bar’s five slots of one width', async () => {
    const user = await finishOnboardingWithAll();
    // The test's window is 750 wide: a slot is 150, and 올리기 is the third.
    expect(screen.getByTestId('tab-tour-hole')).toHaveStyle({ left: 0, width: 150 });
    await press(user, '다음');
    expect(screen.getByTestId('tab-tour-hole')).toHaveStyle({ left: 150 });
    await press(user, '다음');
    expect(screen.getByTestId('tab-tour-hole')).toHaveStyle({ left: 450 });
    await press(user, '다음');
    expect(screen.getByTestId('tab-tour-hole')).toHaveStyle({ left: 600 });
  });
});

describe('leaving the tour', () => {
  it('is skipped for now with 건너뛰기, and comes again on the next start', async () => {
    const user = await finishOnboardingWithAll();
    await press(user, '다음');

    await press(user, '건너뛰기');
    expect(stepShown()).toBeNull();

    await restart();
    expect(stepShown()).toBe('지도');
  });

  it('is turned off for good with 다시 보지 않기', async () => {
    const user = await finishOnboardingWithAll();

    await press(user, '다시 보지 않기');
    expect(stepShown()).toBeNull();

    await restart();
    expect(stepShown()).toBeNull();
  });

  it('is not shown to a User who finished Onboarding before this version', async () => {
    held.onboarded = true;
    await openMain();

    expect(stepShown()).toBeNull();
  });
});

describe('the tour from 내 정보', () => {
  it('replays from its first step for a User who has seen it', async () => {
    held.onboarded = true;
    const user = await openMain();
    await act(() => {
      router.navigate('/me');
    });
    await pass(500);
    expect(stepShown()).toBeNull();

    await user.press(screen.getByRole('button', { name: '탭 안내 다시 보기' }));
    await pass(500);

    expect(stepShown()).toBe('지도');
    await press(user, '건너뛰기');
    expect(stepShown()).toBeNull();
  });
});

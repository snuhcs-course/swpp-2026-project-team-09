/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap } from './support/answer-map';
import { grip, lowerCard, raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// P04 ticket 63, the user's phone check: a chosen restaurant's "메뉴 ›" on the map opens its menu and takes the
// answer's sheet from low to middle, and leaves a raised sheet at its step; only the User's drag or a screen reader's
// step takes it to high. The Lookup's own mark, which raises the sheet the same way, is in `answer-lookup`.

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

// The meal answer's chosen place on the map, whose press opens its menu.
const CHOSEN = '302동식당 · 12:15 · 걸음 20분 · 뼈없는감자탕 외 5 · 4,000원부터';

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

async function asked(): Promise<Awaited<ReturnType<typeof askOnMap>>> {
  const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
  await layStage(390, 760);
  return user;
}

// Partitions: the chosen restaurant pressed with the sheet low, at high, and low again after high.
describe("a chosen restaurant's menu opened from the map", () => {
  it('opens from low at middle', async () => {
    const user = await asked();
    expect(grip()).toBeCollapsed();

    await pressMarker(user, CHOSEN);

    expect(screen.getByTestId('meal-menu')).toBeOnTheScreen();
    expect(grip()).toHaveAccessibilityValue({ text: '중간' });
  });

  it('leaves a high sheet at high', async () => {
    const user = await asked();
    await raiseCard();
    await raiseCard();
    expect(grip()).toHaveAccessibilityValue({ text: '크게' });

    await pressMarker(user, CHOSEN);

    expect(screen.getByTestId('meal-menu')).toBeOnTheScreen();
    expect(grip()).toHaveAccessibilityValue({ text: '크게' });
  });

  it('takes the sheet to middle, not to the high it last stood at, once it was lowered', async () => {
    const user = await asked();
    await raiseCard();
    await raiseCard();
    await lowerCard();
    await lowerCard();
    expect(grip()).toBeCollapsed();

    await pressMarker(user, CHOSEN);

    expect(grip()).toHaveAccessibilityValue({ text: '중간' });
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap } from './support/answer-map';
import { raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 63, the user's phone with PR 552 merged: "＋ 같이" gave "Maximum update depth exceeded" at once. The time
// card was laid out again and told a height a fraction of a point off each time (112, then 111.79, then 111.71 on the
// emulator: its rows' fractional height taken from a height the phone rounds to its pixels), and each told height
// moved the sheet in render. Jest lays nothing out, so the time card's layouts are fired here by hand, as the phone
// fired them, over the whole frame: the sheet must stay where it stands. Not covered: the phone's own layout pass, whose
// pixel rounding made the reports come back without end; the emulator's settled after two (`frame-card-steady` pins
// the rule on the card alone).

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

// The time card's layout, as the phone tells it.
async function layTimeCard(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('time-bar'), 'layout', {
    nativeEvent: { layout: { x: 16, y: 28, width: 358, height } },
  });
  await pass(50);
}

// Where the sheet stands: its translation, which the UI thread draws.
function sheetAt(): number {
  const style: unknown = screen.getByTestId('answer-card').props.style;
  const { transform } = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  const shift: unknown = Array.isArray(transform) ? transform[0] : undefined;
  return typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : Number.NaN;
}

// Partitions: the sheet at low and at middle; the time card's height told again a fraction of a point off, many times
// over, as on the phone; and a real change of the time card's height, which moves the sheet.
describe('the time card told again a fraction of a point off', () => {
  it('leaves the sheet at low where it stands, however often it is told', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await layStage(390, 760);
    await layTimeCard(112);
    const before = sheetAt();

    for (const height of [111.79, 111.71, 111.93, 111.79, 111.71, 111.93]) {
      await layTimeCard(height);
    }

    expect(sheetAt()).toBe(before);
  });

  it('leaves the sheet at middle where it stands', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await layStage(390, 760);
    await layTimeCard(112);
    await raiseCard();
    const before = sheetAt();

    await layTimeCard(111.79);
    await layTimeCard(111.71);

    expect(sheetAt()).toBe(before);
  });

  it('moves the sheet when the time card really grows', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await layStage(390, 760);
    await layTimeCard(112);
    await raiseCard();
    const before = sheetAt();

    await layTimeCard(140);

    expect(sheetAt()).not.toBe(before);
  });
});

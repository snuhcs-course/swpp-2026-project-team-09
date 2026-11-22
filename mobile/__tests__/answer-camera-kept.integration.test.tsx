/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Dimensions } from 'react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type { Point } from '@/map';
import * as projection from '@/map/projection';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { holdBackButton } from './support/back';
import { answerDining } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P02 ticket 37 against the fake main server: the map keeps one size when the navigation gives way to the answer
// frame, so a reply with nothing to draw moves nothing, and the frame's own way out brings back the everyday camera.

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

const TEXT_REPLY = { text: '셔틀 두 대가 정문과 자연대에 있어요.', mapButtons: [], cards: [], proposal: null };

let server: FakeServer;
let back: () => Promise<boolean>;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  back = holdBackButton();
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerDining(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// The camera the plain ground last placed things with.
function cameraNow(placed: jest.SpyInstance<Point, Parameters<typeof projection.inView>>): string {
  return JSON.stringify(placed.mock.calls.at(-1)?.[1]);
}

// Partitions: the frame shown with a reply that draws nothing; left again.
describe("the map's view while the navigation gives way", () => {
  it('stays as high as the screen, the navigation shown or not', async () => {
    const screenHigh = { height: Dimensions.get('window').height };
    const user = await openMain();
    expect(screen.getByTestId('main-map-touches')).toHaveStyle(screenHigh);

    await user.type(screen.getByLabelText(AI_INPUT), '셔틀 어디 있어?');
    server.on('POST /assistant/messages', { status: 200, body: TEXT_REPLY });
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    expect(screen.getByTestId('answer-card')).toBeVisible();
    expect(screen.getByTestId('main-map-touches')).toHaveStyle(screenHigh);
  });
});

// Partitions: ✕ and Android's back button, after an answer that moved the camera.
describe("the frame's own way out", () => {
  it.each([
    [
      '✕',
      async (user: User): Promise<void> => {
        await user.press(screen.getByRole('button', { name: '답 닫기' }));
      },
    ],
    [
      'the back button',
      async (): Promise<void> => {
        await back();
      },
    ],
  ])('brings the camera back to where the everyday map was, with %s', async (_way, leave) => {
    const placed = jest.spyOn(projection, 'inView');
    const user = await openMain();
    const before = cameraNow(placed);
    server.on('POST /assistant/messages', { status: 200, body: MEAL_ANSWER_REPLY, afterMs: 500 });
    await user.type(screen.getByLabelText(AI_INPUT), '배고파');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    await leave(user);
    await pass(500);

    expect(cameraNow(placed)).toContain('zoom');
    expect(cameraNow(placed)).toBe(before);
  });
});

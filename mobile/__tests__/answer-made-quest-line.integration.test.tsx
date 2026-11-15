/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { keep } from '@/storage/kept';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { hideKeyboard, KEYBOARD, showKeyboard } from './support/keyboard';
import { answerMadeQuest, FLAG, KEPT_MADE, MADE, madeLine, pressMarker, signInAsAsker } from './support/made-quest';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { DINNER } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The line of a Quest made from a Plan above the input (P02 ticket 07), against the fake main server. The User leads
// the stored reply's Quest of POST /plans, made from a Plan on this phone, with 민수 invited.

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
  await signInAsAsker();
  answerMainScreen(server);
  answerMadeQuest(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the everyday map; the keyboard up and down again; an answer shown; a card at the bottom and closed again.
describe('the line of a made Quest above the input', () => {
  it('says what the flag says', async () => {
    await openMain(KEPT_MADE);

    expect(madeLine()).toHaveTextContent(FLAG);
  });

  it('gives way while the keyboard is up, and comes back when it goes down', async () => {
    await openMain(KEPT_MADE);

    await showKeyboard(KEYBOARD);
    expect(madeLine()).toBeNull();

    await hideKeyboard();
    expect(madeLine()).toHaveTextContent(FLAG);
  });

  it('gives way while an answer is shown', async () => {
    await keep({ madeQuests: [MADE.id] });

    await askOnMap(server, MEAL_ANSWER_REPLY, () => {
      expect(madeLine()).toHaveTextContent(FLAG);
      return Promise.resolve();
    });

    expect(screen.getByTestId('answer-card')).toBeVisible();
    expect(madeLine()).toBeNull();
  });

  it('gives way to a card at the bottom, and comes back when it closes', async () => {
    const user = await openMain(KEPT_MADE);
    expect(madeLine()).toHaveTextContent(FLAG);

    await pressMarker(user, DINNER);
    expect(screen.getByTestId('map-card')).toBeVisible();
    expect(madeLine()).toBeNull();

    await user.press(within(screen.getByTestId('map-card')).getByRole('button', { name: '닫기' }));
    await pass(500);
    expect(madeLine()).toHaveTextContent(FLAG);
  });
});

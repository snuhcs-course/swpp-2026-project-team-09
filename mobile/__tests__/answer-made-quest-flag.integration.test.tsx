/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { hideKeyboard, KEYBOARD, showKeyboard } from './support/keyboard';
import { answerMadeQuest, FLAG, madeLine, OWN_MARKER, signal, signInAsAsker } from './support/made-quest';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { DINNER } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The flag of a Quest made from a Plan on the everyday map and its line above the input (P02 ticket 07), against the
// fake main server. The User's Quests hold the dinner, which was not made from a Plan, and the stored reply's Quest
// of POST /plans, which the User leads with 민수 invited.

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

// Partitions: a Quest made from a Plan, and one that was not. Expected values: the ticket's "12:33 점심 · 수락 1/2"
// with the stored Quest's start, 12:15, its meal, and 민수 invited.
describe('the flag of a made Quest, with the switch on', () => {
  it("stands on the everyday map in place of the Quest's own marker, and the dinner keeps its own", async () => {
    await openMain({ answerOnMap: true });

    expect(mapThings()).toContain(FLAG);
    expect(mapThings()).not.toContain(OWN_MARKER);
    expect(mapThings()).toContain(DINNER);
  });

  it('stands where the answer was after "이대로 초대" and "닫기", once the Quests are read again', async () => {
    answerMainScreen(server);
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(card().getByRole('button', { name: '이대로 초대' }));
    await pass(500);
    answerMadeQuest(server);
    await signal('quests-changed');

    await user.press(card().getByRole('button', { name: '닫기' }));
    await pass(500);

    expect(mapThings()).toContain(FLAG);
    expect(madeLine()).toHaveTextContent(FLAG);
  });
});

// Partitions: the everyday map; the keyboard up and down again; an answer shown.
describe('the line of a made Quest above the input', () => {
  it('says what the flag says', async () => {
    await openMain({ answerOnMap: true });

    expect(madeLine()).toHaveTextContent(FLAG);
  });

  it('gives way while the keyboard is up, and comes back when it goes down', async () => {
    await openMain({ answerOnMap: true });

    await showKeyboard(KEYBOARD);
    expect(madeLine()).toBeNull();

    await hideKeyboard();
    expect(madeLine()).toHaveTextContent(FLAG);
  });

  it('gives way while an answer is shown', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(screen.getByTestId('answer-card')).toBeVisible();
    expect(madeLine()).toBeNull();
  });
});

// Partitions: the switch off.
describe('a made Quest with the switch off', () => {
  it('draws no flag and no line, and the Quest keeps its own marker', async () => {
    await openMain();

    expect(mapThings()).toContain(OWN_MARKER);
    expect(mapThings()).not.toContain(FLAG);
    expect(madeLine()).toBeNull();
  });
});

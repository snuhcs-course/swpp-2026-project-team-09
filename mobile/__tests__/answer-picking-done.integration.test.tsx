/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, mapThings, timeBar } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { lookOf } from './support/markers';
import { startFresh } from './support/mocks';
import { pickDone, pickRow } from './support/picking';
import { answerMainScreen, askMainServer, JI_WOO, MIN_JUN, PHONE_NOW } from './support/server';

// From 완료 until its answer comes (P04 ticket 64, the user's phone on 2026-11-26): the time card shows what was asked
// for, not the answer before it, and the map is drawn again once, when the answer comes. Against the fake main
// server, over the stored answer for the User alone; 김민준 and 서지우 are checked, and the main server answers with
// its stored answer for three (two Friends) after two seconds, or fails.

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

const ADD = '같이 먹을 친구 추가';
const ALONE_REPLY = { ...MEAL_ANSWER_REPLY, answer: MEAL_ANSWER_ALONE };

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

function chip(): ReturnType<typeof screen.getByRole> {
  return timeBar().getByRole('button', { name: ADD });
}

// Two Friends checked over the answer for the User alone, and 완료 pressed.
async function doneWithTwo(): Promise<void> {
  const user = await askOnMap(server, ALONE_REPLY);
  expect(chip()).toHaveTextContent(/^같이$/u);
  await user.press(chip());
  await user.press(pickRow(MIN_JUN.name));
  await user.press(pickRow(JI_WOO.name));
  await user.press(pickDone());
}

// How many times the map's things change over `ms`, looked at every 100 ms.
async function changesOver(ms: number, last = JSON.stringify(mapThings())): Promise<number> {
  if (ms <= 0) {
    return 0;
  }
  await pass(100);
  const now = JSON.stringify(mapThings());
  return (now === last ? 0 : 1) + (await changesOver(ms - 100, now));
}

// Partitions: the answer on its way and come; the request failed.
describe('완료 until its answer', () => {
  // The user's phone (2026-11-26): "＋ 같이" showed for a moment after 완료, then "같이 2 ›".
  it('shows "같이 2 ›" and the checked faces at once, and draws the map once, when the answer comes', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE, afterMs: 2000 });
    await doneWithTwo();
    await pass(100);

    expect(chip()).toHaveTextContent('같이 2 ›');
    expect(lookOf(MIN_JUN.name)).toMatch(/:selected$/u);
    expect(await changesOver(1500)).toBe(0);
    expect(await changesOver(1500)).toBe(1);
    expect(chip()).toHaveTextContent('같이 2 ›');
  });

  it('goes back to the answer before it, with the toast, when the request fails', async () => {
    server.on('POST /assistant/answers', { status: 500, body: {}, afterMs: 500 });
    await doneWithTwo();
    await pass(1000);

    expect(chip()).toHaveTextContent(/^같이$/u);
    expect(lookOf(MIN_JUN.name)).toMatch(/:addable$/u);
    expect(screen.getByText(/다시 계산하지 못했어요/u)).toBeVisible();
  });
});

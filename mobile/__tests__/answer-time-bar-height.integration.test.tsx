/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { barShift, barTopOf, layFolded, layRows, stepGrip } from './support/time-card';

// The height the time card tells, which the answer sheet's high is measured from (P04 ticket 64), against the fake
// main server over the stored answer to "배고파, 민수랑 같이".

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

const UNFOLD = '사람별 시간 펼치기';

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

// The user's phone (2026-11-26): after picking and raising the sheet, its high went over the time card. Partitions:
// the rows open, then laid out shut ahead of React, as the sheet shuts them on the UI thread at high. Expected
// values: a card 100 high folded, whose rows are 64, keeps telling 100, so that tucked it leaves its strip of 20.
describe("the time bar's folded height", () => {
  it('stays its folded parts’ height when the rows are laid out shut while React still holds them open', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await layFolded(100);
    await layRows(64);
    await press(user, UNFOLD);

    await stepGrip('tuck');

    expect(barShift()).toBe(-(barTopOf() + 100 - 20));
  });
});

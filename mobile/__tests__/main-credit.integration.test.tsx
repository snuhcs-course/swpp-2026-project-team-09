/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { button, findButton } from './support/lists';
import { openLive, socketServer } from './support/live';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMyParty, DINNER_PARTY_MINE } from './support/room';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The map's credit as the User joins and leaves a Party while the map is shown (P15 ticket 07), against the fake
// main server and socket server: the row of buttons appears and goes, and the credit moves with it. Kakao's logo
// takes the same inset, which only the native map draws.

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

const CREDIT = '지도 데이터 출처 보기';
const ACTIVE_PARTY = `활성 파티 ${DINNER_PARTY_MINE.title} 열기`;

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

// The main server tells of a change to the User's Party, which the app fetches again.
async function partyChanged(): Promise<void> {
  await socketServer((socket) => {
    socket.send('party-changed');
  });
  await pass(500);
}

// Partitions: joining from no Party, leaving back to none.
describe("the map's credit as the User joins and leaves a Party", () => {
  it('rises over the row of buttons when the User joins, and comes back to the AI input when they leave', async () => {
    const party = answerMyParty(server, null);
    await openLive();
    // The input's top is 62 above the navigation, 80 high, and the map's own margin of 8 is over it.
    expect(findButton(/^활성 파티/u)).toBeNull();
    expect(button(CREDIT)).toHaveStyle({ left: 16, bottom: 80 + 70 });

    party.set(DINNER_PARTY_MINE);
    await partyChanged();
    // The row ends 126 above the navigation.
    expect(button(ACTIVE_PARTY)).toBeVisible();
    expect(button(CREDIT)).toHaveStyle({ left: 16, bottom: 80 + 134 });

    party.set(null);
    await partyChanged();
    expect(findButton(/^활성 파티/u)).toBeNull();
    expect(button(CREDIT)).toHaveStyle({ left: 16, bottom: 80 + 70 });
  });
});

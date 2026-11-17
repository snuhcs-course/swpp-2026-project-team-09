/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { FRIEND_TAPS } from '@/api/mock/data/tap-lookups';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { factLines } from './support/building';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// A Friend's card fills from the main server's card of the face (P02 ticket 22's Friend half, row 6's decision D11),
// over the fake main server: the card asks POST /assistant/taps for the Friend and draws its fact lines in place of the
// lines the app holds, which stay while it is asked and after a failure. The fake main server gives no Friend a status,
// so the lines replaced are the mock's (`friend-card-tap-mock.integration.test.tsx`).

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

// 김민준's card as the main server wrote it for the mock's 김민준, who is the fake main server's too.
const MIN_JUN_TAP = FRIEND_TAPS.f1;
const MIN_JUN_FACTS = ['공강 · 15:00까지', '62동', '나에게서 걸어서 17분'];

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

function friendCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

// Every text of the card, in order.
function cardTexts(): unknown[] {
  return friendCard()
    .queryAllByText(/./u)
    .map(({ props }): unknown => props.children);
}

// Partitions: the card that came, the one on its way, and a failure.
describe("a Friend's card on the everyday map", () => {
  it("asks for the Friend's card and draws its facts in place of the app's lines", async () => {
    server.on('POST /assistant/taps', { status: 200, body: MIN_JUN_TAP, afterMs: 1000 });
    const user = await openMain();
    await press(user, MIN_JUN.name);
    await pass(100);
    const held = cardTexts();

    await pass(1000);

    expect(server.received('POST /assistant/taps').map(({ body }) => body)).toEqual([
      { tapped: { kind: 'friend', userId: MIN_JUN.id }, location: ON_CAMPUS },
    ]);
    expect(factLines()).toEqual(MIN_JUN_FACTS);
    // The fake main server's 김민준 has no status or way of the app's: the facts come after what the User sees of him.
    const seen = held.indexOf('정확한 위치까지 보여요');
    expect(cardTexts()).toEqual(held.toSpliced(seen + 1, 0, ...MIN_JUN_FACTS));
  });

  it("keeps the app's lines while the card is asked, and after a failure", async () => {
    server.on('POST /assistant/taps', { status: 500, body: { statusCode: 500, message: 'Internal' }, afterMs: 1000 });
    const user = await openMain();
    await press(user, MIN_JUN.name);
    await pass(100);
    const held = cardTexts();

    await pass(5000);

    expect(server.received('POST /assistant/taps').length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId('card-fact')).toEqual([]);
    expect(cardTexts()).toEqual(held);
  });
});

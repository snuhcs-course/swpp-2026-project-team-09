/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { mapThings } from './support/answer-map';
import { pass, screen, shownAddress } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import {
  answerInvitation,
  answerTwoInvitations,
  CARD_ROUTE,
  invitationCard,
  openInvitation,
  SECOND_CARD_ROUTE,
  SECOND_RECEIVED,
} from './support/invitation';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { DINNER } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// Received invitations that end, change, or are several (P02 ticket 06), against the fake main server: the list of
// received invitations holds the stored card's invitation, and its card is the stored card of 민수.

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

const GONE = '이미 끝난 초대예요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerInvitation(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function signal(name: string): Promise<void> {
  await socketServer((socket) => {
    socket.send(name);
  });
  await pass(500);
}

// Partitions: the list read again without the invitation (cancelled by the Leader, or answered on another device);
// the steps changed, which `quests-changed` tells.
describe('a received invitation that changes while its card is shown', () => {
  it('says it is over and closes the card when the list is read again without it', async () => {
    await openMain();
    await openInvitation();
    server.on('GET /quest-invitations', { status: 200, body: [] });

    await signal('quests-changed');

    expect(screen.getByText(GONE)).toBeVisible();
    expect(screen.queryByTestId('invitation-card')).toBeNull();
    expect(mapThings()).toContain(DINNER);
  });

  it('reads the card again on quests-changed', async () => {
    await openMain();
    await openInvitation();
    const reads = server.received(CARD_ROUTE).length;

    await signal('quests-changed');

    expect(server.received(CARD_ROUTE)).toHaveLength(reads + 1);
    expect(invitationCard().getByText('유상의 파티 초대')).toBeVisible();
  });
});

// Partitions: an address of an invitation the known list does not hold; two invitations.
describe('the addresses and cards of received invitations', () => {
  it('says an invitation no card holds is over, stays on the map, and reads nothing', async () => {
    server.on('GET /quest-invitations', { status: 200, body: [] });
    await openMain();

    await openInvitation();

    expect(screen.getByText(GONE)).toBeVisible();
    expect(shownAddress()).toMatch(/^\/main(?:\?|$)/u);
    expect(server.received(CARD_ROUTE)).toEqual([]);
  });

  it("opens each invitation's own card", async () => {
    answerTwoInvitations(server);
    await openMain();

    await openInvitation();
    await openInvitation(SECOND_RECEIVED.id);

    expect(invitationCard().getByText('유상의 파티 초대')).toBeVisible();
    expect(server.received(CARD_ROUTE)).toHaveLength(1);
    expect(server.received(SECOND_CARD_ROUTE)).toHaveLength(1);
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal, SOCKET_SERVER } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { openLive, REPLACED, SIGN_IN, socketServer, theSocket } from './support/live';
import { givePhone, ON_CAMPUS, openMain, type Phone, placeOf } from './support/main';
import { startFresh } from './support/mocks';
import {
  answerMainScreen,
  askMainServer,
  JI_WOO,
  LIBRARY_POSITION,
  MIN_JUN,
  PHONE_NOW,
  RENEWED,
  TOKENS,
} from './support/server';
import { heldTokens } from '@/auth/tokens';

// The one connection to the socket server: what arrives over it, and how it opens again at the token's expiry.

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
let phone: Phone;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the connection to the socket server', () => {
  it('opens once with the access token, and fetches the visible positions when it opens', async () => {
    await openMain();
    const socket = theSocket();
    const before = server.received('GET /positions').length;

    expect(socket.url).toBe(SOCKET_SERVER);
    expect(socket.tokens).toEqual([TOKENS.accessToken]);
    await socketServer(() => {
      socket.accept();
    });

    expect(server.received('GET /positions')).toHaveLength(before + 1);
  });

  // The glide itself is the map's (`map-glide-test.tsx`): the screen gives a Friend's Avatar a glide of five seconds,
  // and this file turns motion off, so the plain ground places the Avatar at once.

  it('fetches the positions again when the app comes back to the front', async () => {
    await openLive();
    const before = server.received('GET /positions').length;

    await phone.comeToFront();

    expect(server.received('GET /positions')).toHaveLength(before + 1);
  });

  it('fetches what it shows again when it opens again after a drop', async () => {
    const socket = await openLive();
    const before = server.received('GET /quests').length;

    await socketServer(() => {
      socket.accept();
    });

    expect(server.received('GET /quests')).toHaveLength(before + 1);
  });
});

describe('positions over the connection', () => {
  it("moves a Friend's Avatar as their position arrives", async () => {
    const socket = await openLive();
    const before = placeOf('김민준');

    await socketServer(() => {
      socket.send('position', { ...LIBRARY_POSITION, latitude: 37.4605, measuredAt: '2026-10-06T04:00:05.000Z' });
    });
    await pass(5000);
    const after = placeOf('김민준');

    expect(after.top).toBeLessThan(before.top);
    expect(after.left).toBeCloseTo(before.left, 5);
  });

  it("takes a Friend's Avatar off the map when their position is removed", async () => {
    const socket = await openLive();

    await socketServer(() => {
      socket.send('position-removed', { userId: MIN_JUN.id });
    });

    expect(screen.queryByRole('button', { name: '김민준' })).toBeNull();
    expect(screen.getByRole('button', { name: '김민준 지도에서 보기' })).toBeVisible();
  });

  it('fetches the Friends again when a position arrives for a Friend they say is unseen', async () => {
    const socket = await openLive();
    const before = server.received('GET /friends').length;
    server.on('GET /friends', { status: 200, body: [MIN_JUN, { ...JI_WOO, visible: true }] });

    await socketServer(() => {
      socket.send('position', { ...LIBRARY_POSITION, userId: JI_WOO.id, longitude: 126.95 });
    });
    await pass(100);

    expect(server.received('GET /friends')).toHaveLength(before + 1);
    expect(screen.getByRole('button', { name: '서지우' })).toBeVisible();
  });
});

describe('signals over the connection', () => {
  it.each([
    ['friends-changed', ['GET /friends', 'GET /positions', 'GET /friend-requests']],
    ['quests-changed', ['GET /quests', 'GET /quest-invitations']],
    ['meetups-changed', ['GET /meetups']],
    ['party-changed', ['GET /parties/mine', 'GET /parties', 'GET /positions']],
  ])('fetches what changed again on the signal %s', async (signal, routes) => {
    const socket = await openLive();
    const before = routes.map((route) => server.received(route).length);

    await socketServer(() => {
      socket.send(signal);
    });

    expect(routes.map((route) => server.received(route).length)).toEqual(before.map((count) => count + 1));
  });
});

describe("the access token's expiry", () => {
  it('renews the Session and opens the connection again with the new token', async () => {
    server.on('POST /auth/refresh', { status: 200, body: RENEWED });
    const socket = await openLive();

    await socketServer(() => {
      socket.close();
    });

    expect(server.received('POST /auth/refresh')).toHaveLength(1);
    expect(socket.tokens).toEqual([TOKENS.accessToken, RENEWED.accessToken]);
    expect(socket.active).toBe(true);
  });

  it('renews the Session when the socket server refuses the token at a reconnection', async () => {
    server.on('POST /auth/refresh', { status: 200, body: RENEWED });
    const socket = await openLive();

    await socketServer(() => {
      socket.refuse();
    });

    expect(socket.tokens).toEqual([TOKENS.accessToken, RENEWED.accessToken]);
  });
});

describe("a renewal at the token's expiry that is refused", () => {
  it('shows the sign-in screen when the renewal is refused', async () => {
    server.on('POST /auth/refresh', refusal(401));
    const socket = await openLive();

    await socketServer(() => {
      socket.close();
    });
    await pass(500);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(screen.queryByText(REPLACED)).toBeNull();
    expect(heldTokens()).toBeNull();
  });

  it('shows the sign-in screen when the new token is refused too', async () => {
    server.on('POST /auth/refresh', { status: 200, body: RENEWED });
    const socket = await openLive();

    await socketServer(() => {
      socket.close();
    });
    await socketServer(() => {
      socket.refuse();
    });
    await pass(500);

    expect(server.received('POST /auth/refresh')).toHaveLength(1);
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });
});

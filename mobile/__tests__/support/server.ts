import type { Friend, Lobby, Position, Quest } from '@/api/types';
import { googleAvailable } from '@/auth/google';
import { dropHeldTokens, forgetTokens, keepTokens, type Tokens } from '@/auth/tokens';
import { type FakeServer, MAIN_SERVER, SOCKET_SERVER, startFakeServer } from './fake-server';
import { idTokenOf } from './id-token';

// A build that asks the main server: it signs in with Google, which the test file replaces, and it has the servers'
// addresses. A test file that uses it mocks `@/auth/google` and `expo-secure-store`:
//
//   jest.mock('@/auth/google', () => ({ googleAvailable: jest.fn(), askGoogle: jest.fn(), forgetGoogle: jest.fn() }));
//   jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));

export const ME_ID = '0b5f8a2e-6a43-4d4b-9a4b-1f3f6f1c9a01';

// An access token as the main server signs one, with the User's id as its subject. Nobody here checks the signature.
export function accessTokenOf(userId: string, serial = 1): string {
  return idTokenOf({ sub: userId, sid: 's1', serial, exp: 4_102_444_800 });
}

export const TOKENS: Tokens = { accessToken: accessTokenOf(ME_ID), refreshToken: 'refresh-1' };
export const RENEWED: Tokens = { accessToken: accessTokenOf(ME_ID, 2), refreshToken: 'refresh-2' };

// Starts the fake main server and makes the build one that asks it. `signedIn` keeps the tokens of a Session.
export async function askMainServer({ signedIn }: { signedIn: boolean }): Promise<FakeServer> {
  process.env.EXPO_PUBLIC_MAIN_SERVER_URL = MAIN_SERVER;
  process.env.EXPO_PUBLIC_SOCKET_SERVER_URL = SOCKET_SERVER;
  jest.mocked(googleAvailable).mockReturnValue(true);
  await forgetTokens();
  dropHeldTokens();
  if (signedIn) {
    await keepTokens(TOKENS);
  }
  return startFakeServer();
}

// --- The main server's answers ---

export const MIN_JUN: Friend = {
  id: '6d1c3f5e-1111-4a5b-8c9d-000000000001',
  name: '김민준',
  department: '컴퓨터공학부',
  sharing: true,
  visible: true,
};

export const JI_WOO: Friend = {
  id: '6d1c3f5e-2222-4a5b-8c9d-000000000002',
  name: '서지우',
  department: '경영학과',
  sharing: true,
  visible: false,
};

export const LIBRARY_POSITION: Position = {
  userId: MIN_JUN.id,
  latitude: 37.4598,
  longitude: 126.9521,
  measuredAt: '2026-10-06T05:00:00.000Z',
};

export const LOBBY: Lobby & { masterSwitch: boolean } = {
  profile: { name: '홍길동', department: '컴퓨터공학부', admissionYear: 2022, hashtags: ['러닝'] },
  masterSwitch: false,
};

// The moment the tests that ask the main server run at, by the phone's clock: 6 October 2026, 13:00 in Korea. Give it
// to `jest.useFakeTimers({ now: PHONE_NOW })`.
export const PHONE_NOW = new Date('2026-10-06T04:00:00.000Z');

// A Quest the User holds with 김민준, which no Party names: a Shared Quest, tonight at 20:10.
export const DINNER: Quest & { leader: unknown; capacity: number; joinPolicy: string } = {
  id: '9a7e0c1d-0000-4f00-8000-00000000d001',
  title: '저녁 약속',
  globalEvent: null,
  leader: { id: ME_ID, name: '홍길동', department: '컴퓨터공학부' },
  capacity: 2,
  joinPolicy: 'closed',
  holders: [
    { id: ME_ID, name: '홍길동', department: '컴퓨터공학부' },
    { id: MIN_JUN.id, name: MIN_JUN.name, department: MIN_JUN.department },
  ],
  subQuests: [
    {
      id: '9a7e0c1d-0000-4f00-8000-00000000d002',
      attending: false,
      title: '저녁 약속',
      startsAt: '2026-10-06T11:10:00.000Z',
      endsAt: '2026-10-06T12:30:00.000Z',
      place: { placeId: 'p63', label: '학생회관 (63동)', latitude: 37.45932, longitude: 126.95058 },
      completion: 'by_time',
      cancelled: false,
      done: false,
      ended: false,
    },
  ],
  classQuest: false,
};

// What every route of the main screen answers, for a User in no Party.
export function answerMainScreen(server: FakeServer): void {
  server.on('POST /lobby', { status: 200, body: LOBBY });
  server.on('GET /friends', { status: 200, body: [MIN_JUN, JI_WOO] });
  server.on('GET /positions', { status: 200, body: [LIBRARY_POSITION] });
  server.on('GET /quests', { status: 200, body: [DINNER] });
  server.on('GET /parties', { status: 200, body: [] });
  server.on('GET /parties/mine', {
    status: 404,
    body: { statusCode: 404, error: 'Not Found', code: 'NOT_IN_PARTY', message: 'The User is in no Party.' },
  });
  server.on('GET /walking-route', { status: 200, body: { status: 'ROUTE_RESULT_NOT_FOUND', route: null } });
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { consentTitle } from '@/screens/main/room-consent';
import { consentedWords, WITHDRAW } from '@/screens/main/room-consented';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, startLibraryChat } from './support/library-chat';
import { LOBBY } from './support/server';

// What the room requests ask of a companion on the main screen, against the fake main server: the consent dialog,
// asking for a missing 학번 first, the one-time notices, and 철회 after consenting.

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
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const REQUEST_ID = 'aaaaaaaa-0000-4000-8000-000000000001';

// What a consent answers; the dialog reads nothing of it.
const GATHERING = {
  id: REQUEST_ID,
  status: 'gathering',
  questId: 'cccccccc-0000-4000-8000-000000000004',
  madeForBooking: true,
  requester: { userId: 'other', name: '이부커' },
  space: { id: '4F-group-6', name: '그룹스터디룸 6인실' },
  date: '2026-11-03',
  start: '15:00',
  minutes: 60,
  useDesc: null,
  reason: null,
  failed: null,
  consents: [],
};

const ASK = {
  requestId: REQUEST_ID,
  requester: { userId: 'other', name: '이부커' },
  space: { id: '4F-group-6', name: '그룹스터디룸 6인실' },
  date: '2026-11-03',
  start: '15:00',
  minutes: 60,
  consented: null,
  recheck: false,
};

describe('the main screen', () => {
  it('asks for the consent with the registered name and 학번, asking for them first when 내 정보 has none', async () => {
    server.on('GET /library/room-requests', { status: 200, body: { asks: [ASK], notices: [] } });
    server.on('PATCH /users/me/profile', {
      status: 200,
      body: { ...LOBBY.profile, studentNumber: '202612345', registeredName: '홍길동' },
    });
    server.on(`POST /library/room-requests/${REQUEST_ID}/consent`, { status: 200, body: GATHERING });
    const chat = await askForCards({ server, library }, [], { words: '안녕' });

    expect(screen.getByText(consentTitle('홍길동'))).toBeVisible();

    await chat.user.type(screen.getByLabelText('학번'), '2026-12345');
    await chat.user.press(screen.getByRole('button', { name: '제공하고 참여' }));
    await pass(100);

    expect(server.received('PATCH /users/me/profile')[0]?.body).toEqual({
      registeredName: '홍길동',
      studentNumber: '202612345',
    });
    expect(server.received(`POST /library/room-requests/${REQUEST_ID}/consent`)).toHaveLength(1);
  });

  it('shows each notice once and marks it seen', async () => {
    const notice = {
      id: 'dddddddd-0000-4000-8000-000000000005',
      requestId: REQUEST_ID,
      text: '파티 구성원이 제안을 거절했습니다',
    };
    server.on('GET /library/room-requests', { status: 200, body: { asks: [], notices: [notice] } });
    server.on(`POST /library/room-notices/${notice.id}/seen`, { status: 204 });
    await askForCards({ server, library }, [], { words: '안녕' });

    expect(screen.getByText('파티 구성원이 제안을 거절했습니다')).toBeVisible();
    expect(server.received(`POST /library/room-notices/${notice.id}/seen`)).toHaveLength(1);
  });
});

describe('a consent withdrawn', () => {
  it('철회 after 제공하고 참여 declines, and the dissolve notice follows', async () => {
    let stage: 'asked' | 'consented' | 'dissolved' = 'asked';
    const notice = {
      id: 'dddddddd-0000-4000-8000-000000000006',
      requestId: REQUEST_ID,
      text: '파티 구성원이 제안을 거절했습니다',
    };
    server.on('GET /library/room-requests', () => ({
      status: 200,
      body: {
        asks: stage === 'dissolved' ? [] : [{ ...ASK, consented: stage === 'consented' ? true : null }],
        notices: stage === 'dissolved' ? [notice] : [],
      },
    }));
    server.on('PATCH /users/me/profile', {
      status: 200,
      body: { ...LOBBY.profile, studentNumber: '202612345', registeredName: '홍길동' },
    });
    server.on(`POST /library/room-requests/${REQUEST_ID}/consent`, () => {
      stage = 'consented';
      return { status: 200, body: GATHERING };
    });
    server.on(`POST /library/room-requests/${REQUEST_ID}/decline`, () => {
      stage = 'dissolved';
      return { status: 204 };
    });
    server.on(`POST /library/room-notices/${notice.id}/seen`, { status: 204 });
    const chat = await askForCards({ server, library }, [], { words: '안녕' });
    await chat.user.type(screen.getByLabelText('학번'), '2026-12345');
    await chat.user.press(screen.getByRole('button', { name: '제공하고 참여' }));
    await pass(100);

    expect(screen.getByText(consentedWords(ASK))).toBeVisible();

    await chat.user.press(screen.getByRole('button', { name: WITHDRAW }));
    await pass(100);

    expect(server.received(`POST /library/room-requests/${REQUEST_ID}/decline`)).toHaveLength(1);
    expect(screen.queryByText(consentedWords(ASK))).toBeNull();
    expect(screen.getByText('파티 구성원이 제안을 거절했습니다')).toBeVisible();
    expect(server.received(`POST /library/room-notices/${notice.id}/seen`)).toHaveLength(1);
  });
});

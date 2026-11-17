/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answer, answerRoom, openRoom, PICNIC, toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// A Quest taken alone (P03 tickets 17 and 19) beside the User's 비공개 파티, against the fake main server: no count of
// parties counts it, and its room offers no 수정, which would invite or recruit into it, and says no 파티 word.

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

const TAKEN = { ...PICNIC, takenAlone: true, capacity: 1 };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  // The User's Quests: the 비공개 파티 저녁 약속, and the picnic taken alone.
  answerRoom(server, TAKEN);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function open(address: string): Promise<void> {
  await openMain();
  await act(() => {
    router.push(address);
  });
  await pass(500);
}

// Partitions: the 파티 tab's count, and 내 정보's. Expected values: one 파티, 저녁 약속.
describe('the counts of parties', () => {
  it('leave out the Quest taken alone on the 파티 tab', async () => {
    await open('/party');

    expect(screen.getByRole('tab', { name: /^내 파티/u })).toHaveTextContent(/1/u);
    expect(screen.getByRole('tab', { name: /^내 파티/u })).not.toHaveTextContent(/2/u);
  });

  it('leave out the Quest taken alone in 내 정보', async () => {
    await open('/me');

    expect(screen.getByRole('button', { name: '참여 중인 파티 1' })).toBeVisible();
  });
});

// Partitions: the room of a Quest taken alone that the User leads; its one action. Expected values: P03 ticket 17's
// decisions and the review of PR 338 (C): a 퀘스트, with no 수정, no 파티 활성화 and no 파티 채팅.
describe('the room of a Quest taken alone', () => {
  it('is a 퀘스트, with no 수정, no 파티 활성화 and no 파티 채팅', async () => {
    await openRoom(TAKEN);

    expect(screen.getByText(TAKEN.title)).toBeVisible();
    expect(screen.getByRole('header', { name: '퀘스트' })).toBeVisible();
    expect(screen.queryByText(/^파티 · /u)).toBeNull();
    expect(screen.queryByText('내가 만든 파티')).toBeNull();
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull();
    expect(screen.queryByLabelText('파티 활성화')).toBeNull();
    expect(screen.queryByText('파티 채팅')).toBeNull();
  });

  it("asks before 퀘스트 없애기, in a 퀘스트's words", async () => {
    const user = await openRoom(TAKEN);

    await user.press(screen.getByRole('button', { name: '퀘스트 없애기' }));

    expect(screen.getByText('퀘스트를 없앨까요?')).toBeVisible();
    expect(screen.getByText('퀘스트가 사라져요.')).toBeVisible();
  });
});

// Partitions: the read room, the room once ended, and the room while it is read. Expected values: the decisions on the
// read of PR 339 (4): no 멤버 and so no 파티장, "퀘스트를 없앴어요", and no title until the room is read.
describe("the room of a Quest taken alone, in a 퀘스트's words", () => {
  it('shows no 멤버, so no 파티장', async () => {
    await openRoom(TAKEN);

    expect(screen.getByRole('header', { name: '퀘스트' })).toBeVisible();
    expect(screen.queryByLabelText('멤버')).toBeNull();
    expect(screen.queryByText('파티장')).toBeNull();
  });

  it('says "퀘스트를 없앴어요" once ended', async () => {
    server.on(`POST /quests/${TAKEN.id}/end`, { status: 204 });
    const user = await openRoom(TAKEN);

    await user.press(screen.getByRole('button', { name: '퀘스트 없애기' }));
    await answer(user, '퀘스트 없애기');

    expect(server.received(`POST /quests/${TAKEN.id}/end`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('퀘스트를 없앴어요');
    expect(toast()).not.toHaveTextContent('파티');
  });

  it('has no title until the room is read', async () => {
    server.on(`GET /quests/${TAKEN.id}`, { status: 200, body: TAKEN, afterMs: 3000 });
    await openRoom(TAKEN);

    expect(screen.queryByRole('header', { name: '파티' })).toBeNull();
    await pass(3000);
    expect(screen.getByRole('header', { name: '퀘스트' })).toBeVisible();
  });
});

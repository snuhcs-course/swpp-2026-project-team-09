/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { KeptNotification } from '@/api/waiting-types';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerRoom, PICNIC, toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// A 파티's own news in 알림 opens the 파티's room, `room:<questId>` (P06 ticket 37). A tapped push opens the room
// itself (`push/notification-room-links`); the main screen still opens the room for the address in its `card`.

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

const STEP_CHANGED: KeptNotification = {
  id: `step-changed:party:${PICNIC.id}:u2`,
  kind: 'step-changed',
  title: '김민준님이 일정을 바꿨어요',
  line: `${PICNIC.title} · '피크닉'으로 바뀌었어요`,
  at: '2026-10-06T12:58:00+09:00',
  url: `/main?card=room:${PICNIC.id}`,
  read: true,
};
const ROW = `${STEP_CHANGED.title} · ${STEP_CHANGED.line} · 12:58`;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server);
  server.on('GET /notifications', { status: 200, body: [STEP_CHANGED] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function pressTheRow(): Promise<void> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
  await user.press(screen.getByRole('button', { name: '알림' }));
  await pass(500);
  await user.press(screen.getByRole('button', { name: ROW }));
  await pass(500);
}

describe("a 파티's own news in 알림", () => {
  it("opens the 파티's room when pressed", async () => {
    await pressTheRow();

    expect(shownAddress()).toBe(`/room/${PICNIC.id}`);
    expect(screen.getByText(PICNIC.title)).toBeVisible();
  });

  it('says the 파티 is gone, and closes the room, when it no longer is', async () => {
    server.on(`GET /quests/${PICNIC.id}`, refusal(404, 'QUEST_NOT_FOUND'));

    await pressTheRow();

    expect(shownAddress()).not.toBe(`/room/${PICNIC.id}`);
    expect(toast()).toHaveTextContent('이미 없는 파티예요');
  });
});

describe("the address of a 파티's own news on the main screen", () => {
  it("opens the 파티's room from the main screen", async () => {
    await openMain();

    await act(() => {
      router.navigate(`/main?card=room:${PICNIC.id}`);
    });
    await pass(500);

    expect(shownAddress()).toBe(`/room/${PICNIC.id}`);
    expect(screen.getByText(PICNIC.title)).toBeVisible();
  });
});

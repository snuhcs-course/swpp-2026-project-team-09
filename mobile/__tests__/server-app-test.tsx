import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { userEvent } from '@testing-library/react-native';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, startApp } from './support/app';
import { openLive, REPLACED, SIGN_IN, socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain, type Phone } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { heldTokens } from '@/auth/tokens';
import { keep, readKept } from '@/storage/kept';

// The app in a build that asks the main server: where it opens, what it shows, and the Session's end.

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

const STUDENT_CENTRE = { latitude: 37.45932, longitude: 126.95058 };

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

describe('the start against the main server', () => {
  it('shows the sign-in screen at the start for a phone that keeps no tokens', async () => {
    await askMainServer({ signedIn: false });
    await keep({ signedIn: true, consented: true, onboardingCompleted: true });
    await startApp();
    await pass(1000);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });

  it("takes the main server's word on Onboarding at the start, with its suggestion", async () => {
    server.on(
      'POST /lobby',
      refusal(403, 'ONBOARDING_REQUIRED', {
        onboarding: { completed: false, suggestion: { name: '홍길동', department: '컴퓨터공학부' } },
      }),
    );
    await keep({ signedIn: true, consented: true, onboardingCompleted: true });
    await startApp();
    await pass(1000);

    expect(screen.getByLabelText('이름')).toHaveDisplayValue('홍길동');
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('컴퓨터공학부');
  });
});

describe('the main screen against the main server', () => {
  it('opens on the main screen with what the main server serves', async () => {
    await openMain();

    expect(server.received('POST /lobby')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '김민준 지도에서 보기' })).toBeVisible();
    expect(screen.getByRole('button', { name: '김민준' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: '비공개 파티 · 김민준 · 저녁 약속 · 20:10 · 학생회관 (63동)' }),
    ).toBeVisible();
    // A User in no Party has no "활성 파티".
    expect(screen.queryByRole('button', { name: /^활성 파티/u })).toBeNull();
  });

  it('shows Onboarding when the main server says so in the middle of the main screen', async () => {
    const socket = await openLive();
    server.on(
      'GET /quests',
      refusal(403, 'ONBOARDING_REQUIRED', {
        onboarding: { completed: false, suggestion: { name: '홍길동', department: null } },
      }),
    );

    await socketServer(() => {
      socket.send('quests-changed');
    });
    await pass(500);

    expect(screen.getByLabelText('이름')).toHaveDisplayValue('홍길동');
    expect((await readKept()).onboardingCompleted).toBe(false);
  });

  it('sends no position of its own while the Master Switch is off', async () => {
    await openLive();
    await phone.moveTo(STUDENT_CENTRE);
    await pass(10_000);

    expect(server.received('POST /positions')).toEqual([]);
  });
});

describe("the Session's end", () => {
  it('shows the notice and the sign-in screen when a sign-in on another phone ended it', async () => {
    const socket = await openLive();

    await socketServer(() => {
      socket.send('session-ended', { code: 'SESSION_REPLACED' });
    });
    await pass(500);

    expect(screen.getByRole('header', { name: REPLACED })).toBeVisible();
    expect(screen.getByText('이 기기에서는 로그아웃됐어요. 다시 쓰려면 로그인해 주세요.')).toBeVisible();
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(heldTokens()).toBeNull();
    expect((await readKept()).signedIn).toBe(false);
    expect(socket.active).toBe(false);

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole('button', { name: '확인' }));
    expect(screen.queryByText(REPLACED)).toBeNull();
  });

  it('shows the sign-in screen without the notice when the Session ended otherwise', async () => {
    const socket = await openLive();

    await socketServer(() => {
      socket.send('session-ended', {});
    });
    await pass(500);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(screen.queryByText(REPLACED)).toBeNull();
  });

  it('shows the notice too when a request is refused with SESSION_REPLACED', async () => {
    const socket = await openLive();
    server.on('GET /quests', refusal(401, 'SESSION_REPLACED'));

    await socketServer(() => {
      socket.send('quests-changed');
    });
    await pass(500);

    expect(screen.getByRole('header', { name: REPLACED })).toBeVisible();
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(server.received('POST /auth/refresh')).toEqual([]);
  });
});

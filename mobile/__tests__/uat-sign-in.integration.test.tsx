/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type * as GoogleModule from '@/auth/google';
import { userEvent } from '@testing-library/react-native';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, startApp } from './support/app';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW, TOKENS } from './support/server';
import { ONBOARDING } from './support/onboarding';

// The UAT branch's sign-in: where the app would ask Google, it lists the three UAT accounts, and a pick sends the
// account's key to the main server in place of Google's ID token.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
// A build that holds Google's module, which Jest cannot load: Google's step itself is the UAT branch's own.
jest.mock('@/auth/google', () => ({
  ...jest.requireActual<typeof GoogleModule>('@/auth/google'),
  googleAvailable: jest.fn<boolean, []>(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const SIGN_IN = '서울대학교 구글 계정(@snu.ac.kr)으로 로그인';
const ANOTHER_ACCOUNT = '다른 서울대 계정으로 로그인';
const CONSENT = '약관에 동의해 주세요';
const AGREE = '동의하고 시작';

const ROWS = ['A · 김서연', 'B · 이도현', 'C · 박지호'];

type User = ReturnType<typeof userEvent.setup>;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: false });
  answerMainScreen(server);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openSignIn(): Promise<User> {
  await startApp();
  await pass(600);
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

function rows(): string[] {
  return screen.getAllByRole('button', { name: /^[ABC] · /u }).map(({ props }) => String(props.accessibilityLabel));
}

describe('the list of UAT accounts', () => {
  it.each([SIGN_IN, ANOTHER_ACCOUNT])('opens from "%s" with the three accounts', async (name) => {
    const user = await openSignIn();

    await user.press(screen.getByRole('button', { name }));
    await pass(400);

    expect(rows()).toEqual(ROWS);
  });

  it('closes without a pick, sends nothing and leaves the sign-in screen as it was', async () => {
    const user = await openSignIn();
    await user.press(screen.getByRole('button', { name: SIGN_IN }));
    await pass(400);

    await user.press(screen.getByRole('button', { name: '계정 고르기 닫기' }));
    await pass(400);

    expect(screen.queryByRole('button', { name: 'A · 김서연' })).toBeNull();
    expect(server.received()).toEqual([]);
    expect(screen.getByRole('header', { name: '서울대 계정으로 로그인' })).toBeVisible();
    expect(screen.getByRole('button', { name: SIGN_IN })).not.toBeBusy();
  });
});

describe('a pick from the list', () => {
  it("signs in with the account's key, then asks for consent and Onboarding with the suggestion", async () => {
    const suggestion = { name: '이도현', department: '경영학과' };
    server.on('POST /auth/google', { status: 200, body: { ...TOKENS, onboarding: { completed: false, suggestion } } });
    const user = await openSignIn();

    await user.press(screen.getByRole('button', { name: SIGN_IN }));
    await pass(400);
    await user.press(screen.getByRole('button', { name: 'B · 이도현' }));
    await pass(400);

    expect(server.received('POST /auth/google').map(({ body }) => body)).toEqual([{ idToken: 'uat-b' }]);
    expect(screen.getByRole('header', { name: CONSENT })).toBeVisible();

    await user.press(screen.getByRole('button', { name: AGREE }));
    await pass(400);
    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.getByLabelText('이름')).toHaveDisplayValue('이도현');
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('경영학과');
  });
});

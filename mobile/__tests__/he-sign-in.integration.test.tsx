/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type * as GoogleModule from '@/auth/google';
import { userEvent } from '@testing-library/react-native';
import type { FakeServer } from './support/fake-server';
import { pass, screen, startApp } from './support/app';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW, TOKENS } from './support/server';
import { EXPLANATION, givePhone } from './support/main';
import { ONBOARDING } from './support/onboarding';
import { keep, readKept } from '@/storage/kept';

// The HE branch's sign-in (P15): where the app would ask Google, it lists the seven HE accounts, and a pick sends the
// account's key to the main server in place of Google's ID token.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
// A build that holds Google's module, which Jest cannot load: Google's step itself is the HE branch's own.
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

// The spec's rows, in the order of its table.
const ROWS = [
  '1라운드 · 김하늘',
  '1라운드 · 최유나',
  '2라운드 · 한지우',
  '2라운드 · 정민재',
  '예비 · 이도현',
  '예비 · 박서진',
  '예비 · 오세린',
];

type User = ReturnType<typeof userEvent.setup>;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
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
  return screen
    .getAllByRole('button', { name: /^(?:1라운드|2라운드|예비) · /u })
    .map(({ props }) => String(props.accessibilityLabel));
}

describe('the list of HE accounts', () => {
  it.each([SIGN_IN, ANOTHER_ACCOUNT])('opens from "%s" with the seven accounts', async (name) => {
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

    expect(screen.queryByRole('button', { name: '1라운드 · 김하늘' })).toBeNull();
    expect(server.received()).toEqual([]);
    expect(screen.getByRole('header', { name: '서울대 계정으로 로그인' })).toBeVisible();
    expect(screen.getByRole('button', { name: SIGN_IN })).not.toBeBusy();
  });
});

describe('a pick from the list', () => {
  it("signs in with the account's key, then asks for consent and Onboarding with the suggestion", async () => {
    const suggestion = { name: '최유나', department: '심리학과' };
    server.on('POST /auth/google', { status: 200, body: { ...TOKENS, onboarding: { completed: false, suggestion } } });
    const user = await openSignIn();

    await user.press(screen.getByRole('button', { name: SIGN_IN }));
    await pass(400);
    await user.press(screen.getByRole('button', { name: '1라운드 · 최유나' }));
    await pass(400);

    expect(server.received('POST /auth/google').map(({ body }) => body)).toEqual([{ idToken: 'he-r1b' }]);
    expect(screen.getByRole('header', { name: CONSENT })).toBeVisible();

    await user.press(screen.getByRole('button', { name: AGREE }));
    await pass(400);
    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.getByLabelText('이름')).toHaveDisplayValue('최유나');
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('심리학과');
  });
});

// The last button of that name: the dialog's, over the screen's.
function dialogButton(name: string): ReturnType<typeof screen.getByRole> {
  const button = screen.getAllByRole('button', { name }).at(-1);
  if (button === undefined) {
    throw new Error(`No button ${name}`);
  }
  return button;
}

// Picks the account and agrees, for an account that finished Onboarding: the main screen follows.
async function signInAs(user: User, row: string): Promise<void> {
  await user.press(screen.getByRole('button', { name: SIGN_IN }));
  await pass(400);
  await user.press(screen.getByRole('button', { name: row }));
  await pass(400);
  expect(screen.getByRole('header', { name: CONSENT })).toBeVisible();
  await user.press(screen.getByRole('button', { name: AGREE }));
  await pass(1000);
  await pass(500);
}

describe('the next evaluator on the phone', () => {
  it('after a sign-out, sees consent and the location explanation again', async () => {
    server.on('POST /auth/google', { status: 200, body: { ...TOKENS, onboarding: { completed: true } } });
    server.on('POST /auth/sign-out', { status: 204 });
    givePhone({ permission: 'unasked' });
    await keep({ backgroundChosen: true });
    const user = await openSignIn();
    await signInAs(user, '1라운드 · 김하늘');
    expect(screen.getByRole('header', { name: EXPLANATION })).toBeVisible();
    await user.press(screen.getByRole('button', { name: '나중에' }));
    await pass(100);

    await user.press(screen.getByRole('tab', { name: '내 정보' }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: '로그아웃' }));
    await user.press(dialogButton('로그아웃'));
    await pass(500);
    expect((await readKept()).backgroundChosen).toBe(false);

    await signInAs(user, '1라운드 · 최유나');
    expect(screen.getByRole('header', { name: EXPLANATION })).toBeVisible();
  });
});

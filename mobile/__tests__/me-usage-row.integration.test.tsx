/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { fireEvent, type userEvent } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { pass, screen } from './support/app';
import { type FakeServer, refusal, type Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW } from './support/server';
import { USAGE_CAPTION, USAGE_NOT_CHANGED } from '@/screens/me/usage-row';
import { readKept } from '@/storage/kept';

// The switch "사용 기록 보내기" on 내 정보 against the fake main server (P08 ticket 11): it shows the account's choice,
// sends each change to the account, keeps the answer on the phone, and asks for no consent again.

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

const SWITCH = '사용 기록 보내기';

type User = ReturnType<typeof userEvent.setup>;
type Host = ReturnType<typeof screen.getByRole>;

function ancestors(node: Host): Host[] {
  const found: Host[] = [];
  for (let at: Host | null = node.parent; at !== null; at = at.parent) {
    found.push(at);
  }
  return found;
}

// The nearest element that holds both.
function holderOf(one: Host, other: Host): Host | undefined {
  const others = new Set(ancestors(other));
  return ancestors(one).find((each) => others.has(each));
}

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

// 내 정보 for a User whose account holds version 1 with that choice.
async function openMe(usage: boolean): Promise<User> {
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, consent: { version: 1, usage } } });
  const user = await openMain({ consent: { version: 1, usage } });
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

async function turn(on: boolean): Promise<void> {
  await fireEvent(screen.getByRole('switch', { name: SWITCH }), 'valueChange', on);
}

function sent(): unknown[] {
  return server.received('PUT /users/me/usage-consent').map(({ body }) => body);
}

it.each([true, false])('shows the account\'s choice, %s, under "오류 보고 보내기" in the same card', async (usage) => {
  await openMe(usage);

  const switches = screen.getAllByRole('switch').map((each) => each.props.accessibilityLabel as unknown);
  const errorReports = switches.indexOf('오류 보고 보내기');
  expect(errorReports).toBeGreaterThanOrEqual(0);
  expect(switches[errorReports + 1]).toBe(SWITCH);
  if (usage) {
    expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
  } else {
    expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
  }
  expect(screen.getByText(USAGE_CAPTION)).toBeVisible();
  // One card holds the two: its hairline is the nearest border around both.
  const holder = holderOf(
    screen.getByRole('switch', { name: '오류 보고 보내기' }),
    screen.getByRole('switch', { name: SWITCH }),
  );
  expect(holder).toHaveStyle({ borderWidth: 1 });
});

it('sends each change with its value, keeps it on the phone, and asks for no consent', async () => {
  server.on('PUT /users/me/usage-consent', { status: 204 });
  await openMe(true);

  await turn(false);
  await pass(100);
  expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
  expect((await readKept()).consent).toEqual({ version: 1, usage: false });

  await turn(true);
  await pass(100);
  expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
  expect((await readKept()).consent).toEqual({ version: 1, usage: true });

  expect(sent()).toEqual([{ usage: false }, { usage: true }]);
  expect(server.received('PUT /users/me/consent')).toHaveLength(0);
  expect(screen.queryByRole('header', { name: '약관에 동의해 주세요' })).toBeNull();
});

it('shows the new position while the change is on its way', async () => {
  server.on('PUT /users/me/usage-consent', { status: 204, afterMs: 2000 });
  await openMe(false);

  await turn(true);
  await pass(100);
  expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
  expect((await readKept()).consent).toEqual({ version: 1, usage: false });

  await pass(2000);
  expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
  expect((await readKept()).consent).toEqual({ version: 1, usage: true });
});

it.each<[string, Reply]>([
  ['a refusal', refusal(409, 'CONSENT_REQUIRED')],
  ['no answer', 'no-answer'],
])('goes back after %s, says so, and keeps nothing', async (_name, reply) => {
  server.on('PUT /users/me/usage-consent', reply);
  await openMe(true);

  await turn(false);
  await pass(100);

  expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
  expect(screen.getByText(USAGE_NOT_CHANGED)).toBeVisible();
  expect((await readKept()).consent).toEqual({ version: 1, usage: true });
});

it('opens the privacy policy at its part on usage data', async () => {
  const user = await openMe(true);
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');

  await user.press(screen.getByRole('link', { name: "'사용 기록' 보기" }));
  await pass(500);

  expect(screen.getByRole('header', { name: '개인정보 처리방침' })).toBeVisible();
  expect(screen.getByRole('header', { name: '사용 기록' })).toBeVisible();
  scrollTo.mockClear();
  await fireEvent(screen.getByTestId('legal-part-usage'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 900, width: 390, height: 400 } },
  });
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 900, animated: false });
  scrollTo.mockRestore();
});

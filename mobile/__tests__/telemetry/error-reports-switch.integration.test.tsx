/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, type userEvent } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import type { ReactElement } from 'react';
import { pass } from '../support/app';
import { givePhone, ON_CAMPUS, openMain } from '../support/main';
import { startFresh } from '../support/mocks';
import { type FakeSentry, fakeSentry } from '../support/sentry';
import { MOCK_WAIT_MS } from '@/api/mock/answer';
import { ERROR_REPORTS_CAPTION } from '@/screens/me/error-reports-row';
import { setSending, startTelemetry, TelemetryBoundary } from '@/telemetry';
import type * as Layer from '@/telemetry/sentry';

// The switch "오류 보고 보내기" on 내 정보, in the mock build with a DSN, through the telemetry layer to the Sentry
// stand-in: off, nothing is reported, and the choice is the phone's, so it holds after a restart and from one sign-in
// to the next.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SWITCH = '오류 보고 보내기';
const SIGN_IN = '서울대학교 구글 계정(@snu.ac.kr)으로 로그인';

type User = ReturnType<typeof userEvent.setup>;

function Failing(): ReactElement {
  throw new Error('The screen failed to draw');
}

function quiet(): void {
  // Nothing is logged.
}

beforeAll(async () => {
  // Not a real project's key: the stand-in sends nothing.
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o0.ingest.us.sentry.io/0';
  await startTelemetry();
});

afterAll(() => {
  delete process.env.EXPO_PUBLIC_SENTRY_DSN;
});

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  // The layer outlives a test, as it outlives a screen: each test begins with the switch on.
  await setSending(true);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  fakeSentry().captureException.mockClear();
  fakeSentry().close.mockClear();
  fakeSentry().init.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function openMe(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

async function turnOff(): Promise<void> {
  await fireEvent(screen.getByRole('switch', { name: SWITCH }), 'valueChange', false);
  await pass(0);
}

// The layer as the next start of the app loads it, on the same phone.
async function nextStart(): Promise<FakeSentry> {
  let loaded: { layer: typeof Layer; sentry: FakeSentry } | undefined;
  jest.isolateModules(() => {
    jest.doMock('@react-native-async-storage/async-storage', () => AsyncStorage);
    loaded = {
      layer: jest.requireActual<typeof Layer>('@/telemetry/sentry'),
      sentry: jest.requireMock<FakeSentry>('@sentry/react-native'),
    };
  });
  if (loaded === undefined) {
    throw new Error('The layer did not load');
  }
  await loaded.layer.startTelemetry();
  return loaded.sentry;
}

it('is on at first, says what a report holds, and opens the privacy policy at its part on error reports', async () => {
  const user = await openMe();
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');

  expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
  expect(screen.getByText(ERROR_REPORTS_CAPTION)).toBeVisible();
  await user.press(screen.getByRole('link', { name: "'오류 보고' 보기" }));
  await pass(500);

  expect(screen.getByRole('header', { name: '개인정보 처리방침' })).toBeVisible();
  expect(screen.getByRole('header', { name: '오류 보고' })).toBeVisible();
  scrollTo.mockClear();
  await fireEvent(screen.getByTestId('legal-part-error-reports'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 640, width: 390, height: 300 } },
  });
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 640, animated: false });
  scrollTo.mockRestore();
});

it('reports no test error once turned off, and closes Sentry', async () => {
  const user = await openMe();

  await turnOff();
  expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
  await user.longPress(screen.getByText(/^앱 /u));
  await user.press(screen.getByRole('button', { name: '보내기' }));

  expect(fakeSentry().close).toHaveBeenCalledTimes(1);
  expect(fakeSentry().captureException).not.toHaveBeenCalled();
});

it('reports no screen that throws while drawing once turned off', async () => {
  jest.spyOn(console, 'error').mockImplementation(quiet);
  await setSending(false);

  await render(
    <TelemetryBoundary>
      <Failing />
    </TelemetryBoundary>,
  );

  expect(screen.getByText('문제가 생겼어요')).toBeVisible();
  expect(fakeSentry().captureException).not.toHaveBeenCalled();
});

it('holds after a restart: the next start does not start Sentry', async () => {
  await openMe();

  await turnOff();

  expect(await AsyncStorage.getItem('snunow.error-reports')).toBe('off');
  expect((await nextStart()).init).not.toHaveBeenCalled();
});

it('holds after signing out and in again', async () => {
  const user = await openMe();
  await turnOff();

  await user.press(screen.getByRole('button', { name: '로그아웃' }));
  const confirm = screen.getAllByRole('button', { name: '로그아웃' }).at(-1);
  if (confirm === undefined) {
    throw new Error('The dialog has no 로그아웃');
  }
  await user.press(confirm);
  await pass(500);
  await user.press(screen.getByRole('button', { name: SIGN_IN }));
  await pass(MOCK_WAIT_MS);
  await pass(1000);
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);

  expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
  expect(await AsyncStorage.getItem('snunow.error-reports')).toBe('off');
  expect((await nextStart()).init).not.toHaveBeenCalled();
  // Two starts of the app and a sign-in: longer than one start.
}, 120_000);

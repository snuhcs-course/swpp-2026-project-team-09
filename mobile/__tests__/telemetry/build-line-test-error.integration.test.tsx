/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';
import { BuildLine, TEST_ERROR_MESSAGE } from '@/screens/me/build-line';
import { startTelemetry } from '@/telemetry';
import { fakeSentry } from '../support/sentry';

// The test error behind a long press on 내 정보's build line, through the telemetry layer to the Sentry stand-in.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
}));

beforeAll(() => {
  // Not a real project's key: the stand-in sends nothing.
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o0.ingest.us.sentry.io/0';
  startTelemetry();
});

afterAll(() => {
  delete process.env.EXPO_PUBLIC_SENTRY_DSN;
});

beforeEach(() => {
  fakeSentry().captureException.mockClear();
});

async function longPressTheLine(): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  await render(<BuildLine />);
  await user.longPress(screen.getByText(/^앱 /u));
  return user;
}

it('asks first, and reports one test error on 보내기', async () => {
  const user = await longPressTheLine();

  expect(screen.getByText('시험 오류를 보낼까요?')).toBeVisible();
  expect(fakeSentry().captureException).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: '보내기' }));

  expect(screen.queryByText('시험 오류를 보낼까요?')).toBeNull();
  expect(fakeSentry().captureException).toHaveBeenCalledTimes(1);
  expect(fakeSentry().captureException).toHaveBeenCalledWith(expect.objectContaining({ message: TEST_ERROR_MESSAGE }), {
    tags: { where: 'test-error' },
  });
});

it('reports nothing on 취소', async () => {
  const user = await longPressTheLine();

  await user.press(screen.getByRole('button', { name: '취소' }));

  expect(screen.queryByText('시험 오류를 보낼까요?')).toBeNull();
  expect(fakeSentry().captureException).not.toHaveBeenCalled();
});

it('asks nothing on a short press', async () => {
  const user = userEvent.setup();
  await render(<BuildLine />);

  await user.press(screen.getByText(/^앱 /u));

  expect(screen.queryByText('시험 오류를 보낼까요?')).toBeNull();
});

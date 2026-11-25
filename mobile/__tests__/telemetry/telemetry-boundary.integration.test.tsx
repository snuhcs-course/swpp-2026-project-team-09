/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, userEvent } from '@testing-library/react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { RouteBreadcrumb, startTelemetry, TelemetryBoundary } from '@/telemetry';
import { fakeSentry } from '../support/sentry';

// The error boundary and the route breadcrumb in a layout drawn as the root layout draws them, over expo-router, with
// the telemetry layer started against the Sentry stand-in.

const QUEST = '3f2a1c9e-8b7d-4e6f-9a0b-1c2d3e4f5a6b';

function quiet(): void {
  // Nothing is logged.
}

// Whether the quest's screen throws the next time it draws.
let failing = false;

function Layout(): ReactElement {
  return (
    <>
      <TelemetryBoundary>
        <Stack screenOptions={{ headerShown: false }} />
      </TelemetryBoundary>
      <RouteBreadcrumb />
    </>
  );
}

function Start(): ReactElement {
  return <Text>시작</Text>;
}

function Quest(): ReactElement {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  if (failing) {
    throw new Error(`The quest ${questId} failed to draw`);
  }
  return <Text>퀘스트 화면</Text>;
}

async function startApp(): Promise<void> {
  await renderRouter({ _layout: Layout, index: Start, 'quests/[questId]': Quest }, { initialUrl: '/' });
}

beforeAll(async () => {
  // Not a real project's key: the stand-in sends nothing.
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o0.ingest.us.sentry.io/0';
  // Sentry starts once the phone's choice is read.
  await startTelemetry();
});

afterAll(() => {
  delete process.env.EXPO_PUBLIC_SENTRY_DSN;
});

beforeEach(() => {
  failing = false;
  fakeSentry().captureException.mockClear();
  fakeSentry().addBreadcrumb.mockClear();
  // React logs the error it caught; the test reads what the boundary did with it.
  jest.spyOn(console, 'error').mockImplementation(quiet);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a screen that throws while drawing', () => {
  // The boundary is around the Stack, so the Stack is drawn anew on 다시 시도 and starts from the start screen, as a
  // start of the app does; a screen still failing would show the message again.
  it('shows 문제가 생겼어요, reports once, and draws the screens again on 다시 시도', async () => {
    await startApp();
    failing = true;
    await act(() => {
      router.push(`/quests/${QUEST}`);
    });

    expect(await screen.findByText('문제가 생겼어요')).toBeVisible();
    expect(fakeSentry().captureException).toHaveBeenCalledTimes(1);
    expect(fakeSentry().captureException).toHaveBeenCalledWith(expect.any(Error), { tags: { where: 'screen' } });

    failing = false;
    await userEvent.setup().press(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('시작')).toBeVisible();
    expect(screen.queryByText('문제가 생겼어요')).toBeNull();
    await act(() => {
      router.push(`/quests/${QUEST}`);
    });
    expect(await screen.findByText('퀘스트 화면')).toBeVisible();
    expect(fakeSentry().captureException).toHaveBeenCalledTimes(1);
  });

  it('leaves the other screens as they are when nothing throws', async () => {
    await startApp();
    expect(await screen.findByText('시작')).toBeVisible();
    expect(screen.queryByText('문제가 생겼어요')).toBeNull();
    expect(fakeSentry().captureException).not.toHaveBeenCalled();
  });
});

describe('the route breadcrumb', () => {
  it("holds the parameter's name and not its value", async () => {
    await startApp();
    await act(() => {
      router.push(`/quests/${QUEST}`);
    });
    await screen.findByText('퀘스트 화면');

    const routes = fakeSentry().addBreadcrumb.mock.calls.map(([breadcrumb]) => breadcrumb.message);
    expect(routes).toEqual(['/', '/quests/[questId]']);
    expect(JSON.stringify(fakeSentry().addBreadcrumb.mock.calls)).not.toContain(QUEST);
  });
});

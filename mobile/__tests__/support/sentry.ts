/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as Sentry from '@sentry/react-native';

// The stand-in for `@sentry/react-native` that every test runs with (`jest-setup.ts`): the SDK's native module is not
// there in Jest, and no test may send a report. It records the calls the telemetry layer makes, so a test can read
// them through `fakeSentry()`.

export interface FakeSentry {
  init: jest.Mock<void, [Sentry.ReactNativeOptions]>;
  captureException: jest.Mock<string, [unknown, unknown?]>;
  addBreadcrumb: jest.Mock<void, [Sentry.Breadcrumb]>;
  close: jest.Mock<Promise<void>, []>;
}

// A new stand-in, for `jest.mock`'s factory.
export function sentryModule(): FakeSentry {
  return {
    init: jest.fn<void, [Sentry.ReactNativeOptions]>(),
    captureException: jest.fn((_error: unknown, _context?: unknown) => 'event-id'),
    addBreadcrumb: jest.fn<void, [Sentry.Breadcrumb]>(),
    close: jest.fn(() => Promise.resolve()),
  };
}

// The stand-in the code under test was given, in this test's module registry.
export function fakeSentry(): FakeSentry {
  return jest.requireMock<FakeSentry>('@sentry/react-native');
}

// The options the layer started Sentry with. Fails when it did not start it.
export function startedWith(sentry: FakeSentry): Sentry.ReactNativeOptions {
  const options = sentry.init.mock.calls.at(-1)?.[0];
  if (options === undefined) {
    throw new Error('Sentry was not started');
  }
  return options;
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as Errors from '@/api/errors';
import type * as Layer from '@/telemetry/sentry';
import { type FakeSentry, startedWith } from '../support/sentry';

// The telemetry layer against the Sentry stand-in: whether it starts, the options it starts Sentry with, and what it
// lets through. Each test loads the layer anew, as each start of the app does.

jest.mock('expo-updates', () => ({ updateId: '0193A5C1-UPDATE', runtimeVersion: 'fingerprint-hash' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.4' } } }));

// Not a real project's key: the stand-in sends nothing.
const DSN = 'https://public@o0.ingest.us.sentry.io/0';

interface Loaded {
  layer: typeof Layer;
  sentry: FakeSentry;
  // The layer's own copy, as it tells a refusal by its class.
  ApiError: typeof Errors.ApiError;
}

// The layer keeps whether it started, so each test loads a fresh copy, with the stand-in and the error class it sees.
function loadLayer(dsn?: string): Loaded {
  if (dsn === undefined) {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  } else {
    process.env.EXPO_PUBLIC_SENTRY_DSN = dsn;
  }
  let loaded: Loaded | undefined;
  jest.isolateModules(() => {
    loaded = {
      layer: jest.requireActual<typeof Layer>('@/telemetry/sentry'),
      sentry: jest.requireMock<FakeSentry>('@sentry/react-native'),
      ApiError: jest.requireActual<typeof Errors>('@/api/errors').ApiError,
    };
  });
  if (loaded === undefined) {
    throw new Error('The layer did not load');
  }
  return loaded;
}

afterEach(() => {
  delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  delete process.env.EXPO_PUBLIC_RELEASE_TAG;
  delete process.env.EXPO_PUBLIC_RELEASE_COMMIT;
});

describe('without EXPO_PUBLIC_SENTRY_DSN', () => {
  it('starts nothing, reports nothing and leaves no breadcrumb', () => {
    const { layer, sentry } = loadLayer();

    layer.startTelemetry();
    layer.reportError(new Error('boom'), 'screen');
    layer.noteRoute('/quests');

    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('treats an empty DSN as none', () => {
    const { layer, sentry } = loadLayer('  ');
    layer.startTelemetry();
    expect(sentry.init).not.toHaveBeenCalled();
  });
});

describe('with EXPO_PUBLIC_SENTRY_DSN', () => {
  it('starts Sentry once', () => {
    const { layer, sentry } = loadLayer(DSN);
    layer.startTelemetry();
    layer.startTelemetry();
    expect(sentry.init).toHaveBeenCalledTimes(1);
  });

  it("starts Sentry with the spec's settings", () => {
    const { layer, sentry } = loadLayer(DSN);
    layer.startTelemetry();

    const options = startedWith(sentry);
    expect(options).toMatchObject({
      dsn: DSN,
      enableNative: true,
      enableNativeCrashHandling: true,
      enableAppHangTracking: true,
      enableAutoSessionTracking: true,
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      enableLogs: false,
      enableCaptureFailedRequests: false,
      enableNetworkBreadcrumbs: false,
      enableAutoBreadcrumbTracking: false,
      enableUserInteractionBreadcrumbs: false,
    });
    // A sample rate given at all, even 0, would add tracing's, profiling's or replay's integrations.
    for (const rate of [
      'tracesSampleRate',
      'tracesSampler',
      'profilesSampleRate',
      'replaysSessionSampleRate',
      'replaysOnErrorSampleRate',
    ]) {
      expect(options).not.toHaveProperty(rate);
    }
    // The SDK takes them from the native build.
    expect(options).not.toHaveProperty('release');
    expect(options).not.toHaveProperty('dist');
  });
});

describe('what the layer hands Sentry', () => {
  it('tags every report with the Release, the update, the versions and the platform', () => {
    process.env.EXPO_PUBLIC_RELEASE_TAG = 'snunow/app/26.11.25-1';
    process.env.EXPO_PUBLIC_RELEASE_COMMIT = '1a2b3c4d';
    const { layer, sentry } = loadLayer(DSN);
    layer.startTelemetry();

    expect(startedWith(sentry).initialScope).toEqual({
      tags: {
        release_tag: 'snunow/app/26.11.25-1',
        release_commit: '1a2b3c4d',
        ota_update_id: '0193A5C1-UPDATE',
        runtime_version: 'fingerprint-hash',
        app_version: '1.0.4',
        platform: 'ios',
      },
    });
  });

  it('reports a handled error with where it came from', () => {
    const { layer, sentry } = loadLayer(DSN);
    layer.startTelemetry();
    const error = new Error('boom');

    layer.reportError(error, 'test-error');

    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    expect(sentry.captureException).toHaveBeenCalledWith(error, { tags: { where: 'test-error' } });
  });

  it('leaves a breadcrumb with the route it is given', () => {
    const { layer, sentry } = loadLayer(DSN);
    layer.startTelemetry();

    layer.noteRoute('/room/[questId]');

    expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'navigation', message: '/room/[questId]' }),
    );
  });
});

describe("a refusal of the main server's", () => {
  it.each([400, 401, 403, 404, 409, 422, 499])('is never reported by reportError, with %i', (status) => {
    const { layer, sentry, ApiError } = loadLayer(DSN);
    layer.startTelemetry();

    layer.reportError(new ApiError(status, 'NOT_IN_PARTY'), 'screen');

    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('is dropped by beforeSend when nothing caught it', async () => {
    const { layer, sentry, ApiError } = loadLayer(DSN);
    layer.startTelemetry();
    const { beforeSend } = startedWith(sentry);

    const sent = await beforeSend?.(
      { type: undefined, message: 'The main server answered 404 NOT_IN_PARTY.' },
      { originalException: new ApiError(404, 'NOT_IN_PARTY') },
    );

    expect(sent).toBeNull();
  });

  it('is not one when the main server failed or did not answer: those are reported', () => {
    const { layer, sentry, ApiError } = loadLayer(DSN);
    layer.startTelemetry();

    layer.reportError(new ApiError(500), 'screen');
    layer.reportError(new ApiError(0), 'screen');

    expect(sentry.captureException).toHaveBeenCalledTimes(2);
  });
});

describe('beforeSend and beforeBreadcrumb', () => {
  it('scrub what they let through', async () => {
    const { layer, sentry } = loadLayer(DSN);
    layer.startTelemetry();
    const { beforeSend, beforeBreadcrumb } = startedWith(sentry);

    const sent = await beforeSend?.(
      { type: undefined, request: { url: '/places?lat=37.45&lng=126.95' }, user: { id: 'u1', email: 'a@snu.ac.kr' } },
      { originalException: new Error('boom') },
    );

    expect(sent).toEqual({ type: undefined, request: { url: '/places' }, user: { id: 'u1' } });
    expect(beforeBreadcrumb?.({ category: 'console', message: 'log' })).toBeNull();
  });
});

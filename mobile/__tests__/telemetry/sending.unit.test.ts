/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type AsyncStorageModule from '@react-native-async-storage/async-storage';
import type * as Layer from '@/telemetry/sentry';
import { type FakeSentry, startedWith } from '../support/sentry';

// The switch "오류 보고 보내기" and Sentry's user in the telemetry layer, against the Sentry stand-in. Each test loads
// the layer anew, with the phone's storage as that start of the app finds it.

jest.mock('expo-updates', () => ({ updateId: '0193A5C1-UPDATE', runtimeVersion: 'fingerprint-hash' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.4' } } }));

// Not a real project's key: the stand-in sends nothing.
const DSN = 'https://public@o0.ingest.us.sentry.io/0';

interface Loaded {
  layer: typeof Layer;
  sentry: FakeSentry;
  storage: typeof AsyncStorageModule;
}

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
      storage: jest.requireActual<typeof AsyncStorageModule>('@react-native-async-storage/async-storage'),
    };
  });
  if (loaded === undefined) {
    throw new Error('The layer did not load');
  }
  return loaded;
}

afterEach(() => {
  delete process.env.EXPO_PUBLIC_SENTRY_DSN;
});

const KEY = 'snunow.error-reports';

describe('the switch "오류 보고 보내기" at a start', () => {
  it('starts nothing at a start with the switch off, and reports nothing', async () => {
    const { layer, sentry, storage } = loadLayer(DSN);
    await storage.setItem(KEY, 'off');

    await layer.startTelemetry();
    layer.reportError(new Error('boom'), 'test-error');
    layer.noteRoute('/main');

    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('starts Sentry on a phone that kept no choice', async () => {
    const { layer, sentry } = loadLayer(DSN);
    await layer.startTelemetry();
    expect(sentry.init).toHaveBeenCalledTimes(1);
  });

  it('sends a handled error reported before the choice was read once it is read on, and drops it when off', async () => {
    const on = loadLayer(DSN);
    const startingOn = on.layer.startTelemetry();
    on.layer.reportError(new Error('early'), 'screen');
    await startingOn;
    expect(on.sentry.captureException).toHaveBeenCalledTimes(1);

    on.sentry.captureException.mockClear();
    const off = loadLayer(DSN);
    await off.storage.setItem(KEY, 'off');
    const startingOff = off.layer.startTelemetry();
    off.layer.reportError(new Error('early'), 'screen');
    await startingOff;
    expect(off.sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('the switch turned while the app runs', () => {
  it('drops an unhandled error at once when turned off while the app runs, and closes the client', async () => {
    const { layer, sentry } = loadLayer(DSN);
    await layer.startTelemetry();
    const { beforeSend } = startedWith(sentry);

    const turning = layer.setSending(false);
    // At once: before the phone has kept the choice or the client has closed.
    const sent = await beforeSend?.({ type: undefined, message: 'boom' }, { originalException: new Error('boom') });
    await turning;

    expect(sent).toBeNull();
    expect(sentry.close).toHaveBeenCalledTimes(1);
    layer.reportError(new Error('boom'), 'test-error');
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('starts Sentry again in the same run when turned on again', async () => {
    const { layer, sentry } = loadLayer(DSN);
    await layer.startTelemetry();
    await layer.setSending(false);

    await layer.setSending(true);
    layer.reportError(new Error('boom'), 'test-error');

    expect(sentry.init).toHaveBeenCalledTimes(2);
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('keeps the choice on the phone for the next start', async () => {
    const { layer, storage } = loadLayer(DSN);
    await layer.startTelemetry();

    await layer.setSending(false);

    expect(await storage.getItem(KEY)).toBe('off');
  });
});

describe("Sentry's user", () => {
  it('is the User id alone, also when it was known before Sentry started', async () => {
    const { layer, sentry } = loadLayer(DSN);
    layer.identifyUser('0b5f8a2e-6a43-4d4b-9a4b-1f3f6f1c9a01');

    await layer.startTelemetry();

    expect(sentry.setUser.mock.calls).toEqual([[{ id: '0b5f8a2e-6a43-4d4b-9a4b-1f3f6f1c9a01' }]]);
  });

  it('is cleared by forgetUser', async () => {
    const { layer, sentry } = loadLayer(DSN);
    await layer.startTelemetry();
    layer.identifyUser('0b5f8a2e-6a43-4d4b-9a4b-1f3f6f1c9a01');

    layer.forgetUser();

    expect(sentry.setUser).toHaveBeenLastCalledWith(null);
  });

  it('is not set without a DSN', () => {
    const { layer, sentry } = loadLayer();
    layer.identifyUser('0b5f8a2e-6a43-4d4b-9a4b-1f3f6f1c9a01');
    expect(sentry.setUser).not.toHaveBeenCalled();
  });
});

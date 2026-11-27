/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { postHogModule } from '../support/posthog';
import { fakeAppState, forgetEnvironment, loadLayer as load, OTHER, signIn, TOKEN, USER } from '../support/usage-layer';

// The usage layer against the PostHog stand-in, which models the installed SDK's queue: when it makes a client, the
// options it makes it with, what it lets through, and what the switch, a sign-out and a new User do. Each test loads
// the layer anew, as each start of the app does. The events themselves are in `usage-events.unit.test.ts`.

jest.mock('expo-updates', () => ({ updateId: '0193A5C1-UPDATE', runtimeVersion: 'fingerprint-hash' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.4' } } }));

const mockAppState = fakeAppState();
jest.mock('react-native/Libraries/AppState/AppState', () => ({ __esModule: true, default: mockAppState }));

function loadLayer(token?: string): ReturnType<typeof load> {
  return load(token, mockAppState);
}

afterEach(() => {
  forgetEnvironment();
  jest.restoreAllMocks();
});

describe('without EXPO_PUBLIC_POSTHOG_TOKEN', () => {
  it('makes no client, and track does nothing', () => {
    const { usage, user, posthog } = loadLayer();
    usage.allowUsage(true);
    user.identifyUser(USER);
    usage.track('app_opened');
    usage.noteScreen('/room/[questId]');
    user.forgetUser();
    expect(posthog.default).not.toHaveBeenCalled();
    expect(posthog.clients).toEqual([]);
  });

  it('treats a blank token as none', () => {
    const { usage, user, posthog } = loadLayer('  ');
    usage.allowUsage(true);
    user.identifyUser(USER);
    expect(posthog.default).not.toHaveBeenCalled();
  });
});

describe('the client', () => {
  it("is made once, with the token and the spec's options", () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);
    loaded.usage.allowUsage(false);
    loaded.usage.allowUsage(true);
    expect(loaded.posthog.default).toHaveBeenCalledTimes(1);
    expect(client.token).toBe(TOKEN);
    expect(client.options).toEqual({
      host: 'https://us.i.posthog.com',
      defaultOptIn: false,
      captureAppLifecycleEvents: false,
      preloadFeatureFlags: false,
      disableRemoteFeatureFlags: true,
      sendFeatureFlagEvent: false,
      disableSurveys: true,
      enableSessionReplay: false,
      errorTracking: { autocapture: false },
      capturePushNotificationSubscriptions: false,
      capturePushNotificationOpened: false,
      disableGeoip: true,
      personProfiles: 'identified_only',
      setDefaultPersonProperties: false,
      fetchRetryCount: 0,
    });
  });

  it('forgets what an earlier run left before it opts in and identifies the User', () => {
    const client = signIn(loadLayer(TOKEN));
    expect(client.calls.slice(0, 3)).toEqual([['reset'], ['optIn'], ['identify', USER, undefined]]);
  });
});

describe('when it may send', () => {
  it('sends nothing before a User is identified with usage chosen', () => {
    const { usage, user, posthog } = loadLayer(TOKEN);
    usage.track('app_opened');
    usage.allowUsage(true);
    usage.noteScreen('/quests');
    expect(posthog.clients).toEqual([]);

    usage.allowUsage(false);
    user.identifyUser(USER);
    usage.noteScreen('/quests');
    expect(posthog.clients).toEqual([]);
  });

  it('sends nothing for a User who chose no', () => {
    const { usage, user, posthog } = loadLayer(TOKEN);
    usage.allowUsage(false);
    user.identifyUser(USER);
    usage.track('app_opened');
    expect(posthog.clients).toEqual([]);
  });

  it('identifies the User by the id alone, and sends app_opened', () => {
    const client = signIn(loadLayer(TOKEN));
    expect(client.calls.filter(([method]) => method === 'identify')).toEqual([['identify', USER, undefined]]);
    expect(client.queue.map(({ event, distinctId }) => [event, distinctId])).toEqual([
      ['$identify', USER],
      ['app_opened', USER],
    ]);
  });
});

describe('a sign-out', () => {
  it('sends nothing after forgetUser, which flushes and then resets', async () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);
    loaded.usage.noteScreen('/quests');

    loaded.user.forgetUser();
    await Promise.resolve();
    loaded.usage.track('app_opened');
    loaded.usage.noteScreen('/me');

    const flushAt = client.calls.findIndex(([method]) => method === 'flush');
    const resetAt = client.calls.findLastIndex(([method]) => method === 'reset');
    expect(flushAt).toBeGreaterThan(-1);
    expect(resetAt).toBeGreaterThan(flushAt);
    expect(client.sent.map(({ event }) => event)).toEqual(['$identify', 'app_opened', 'screen_viewed']);
    expect(client.queue).toEqual([]);
    expect(client.optedOut).toBe(true);
  });

  it('does not let the next User inherit the opt-in: they are opted in only once allowed', () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);
    loaded.user.forgetUser();

    loaded.user.identifyUser(OTHER);
    loaded.usage.track('app_opened');
    expect(client.optedOut).toBe(true);
    expect(client.queue).toEqual([]);

    loaded.usage.allowUsage(true);
    expect(client.queue.map(({ event, distinctId }) => [event, distinctId])).toEqual([
      ['$identify', OTHER],
      ['app_opened', OTHER],
    ]);
  });
});

describe('the switch', () => {
  it('turned off, drops what waits unsent and captures nothing new', async () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);
    loaded.usage.noteScreen('/quests');
    loaded.usage.noteScreen('/me');
    expect(client.queue).toHaveLength(4);

    loaded.usage.allowUsage(false);
    await Promise.resolve();
    loaded.usage.noteScreen('/map');
    loaded.usage.track('app_opened');
    // A later flush, the SDK's timer's or a move to the background's, has nothing left to send.
    await client.flush();

    expect(client.calls).toContainEqual(['optOut']);
    expect(client.sent).toEqual([]);
    expect(client.queue).toEqual([]);
  });

  it('turned on again, opts in, identifies the User and sends app_opened', () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);
    loaded.usage.allowUsage(false);
    const before = client.calls.length;

    loaded.usage.allowUsage(true);

    expect(client.calls.slice(before).map(([method]) => method)).toEqual(['optIn', 'identify', 'capture']);
    expect(client.calls.at(-2)).toEqual(['identify', USER, undefined]);
    expect(client.events()).toEqual(['app_opened']);
  });

  it('follows each write of the copy without doing anything twice', () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);
    loaded.usage.allowUsage(true);
    loaded.usage.allowUsage(true);
    expect(client.events()).toEqual(['app_opened']);
  });
});

describe('a press of the switch while its request is on its way', () => {
  it('pressed off, holds off against a late copy that still says on, until the press is answered', async () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);

    const release = loaded.usage.holdUsage(false);
    await Promise.resolve();
    // A Lobby read before the account took the press writes its copy, still "on".
    loaded.usage.allowUsage(true);
    loaded.usage.noteScreen('/map');
    // The account answered and its copy, now "off", was kept; the hold ends.
    loaded.usage.allowUsage(false);
    release();
    loaded.usage.track('app_opened');

    expect(client.sent).toEqual([]);
    expect(client.queue).toEqual([]);
  });

  it("lets a later press's hold stand when an earlier press is answered", () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);
    const first = loaded.usage.holdUsage(false);
    loaded.usage.holdUsage(true);
    const before = client.events().length;

    first();
    loaded.usage.noteScreen('/map');

    expect(client.events().slice(before)).toContain('screen_viewed');
  });
});

describe('the stand-in, as posthog-react-native 4.87.3', () => {
  it('keeps the queue after optOut and after reset, which is why the layer drops it itself', async () => {
    const { default: PostHog } = postHogModule();
    const client = new PostHog(TOKEN, { defaultOptIn: false });
    await client.optIn();
    client.capture('app_opened');
    await client.optOut();
    client.reset();
    expect(client.queue.map(({ event }) => event)).toEqual(['app_opened']);
    expect(client.optedOut).toBe(true);
  });
});

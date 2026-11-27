/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ServerCode } from '@/telemetry/events';
import type { FakeClient } from '../support/posthog';
import { fakeAppState, forgetEnvironment, loadLayer as load, signIn, TOKEN } from '../support/usage-layer';

// The usage layer's events against the PostHog stand-in: when app_opened is sent, the route of screen_viewed, the
// properties every event carries, and what the registry lets `track` take.

jest.mock('expo-updates', () => ({ updateId: '0193A5C1-UPDATE', runtimeVersion: 'fingerprint-hash' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.4' } } }));

const mockAppState = fakeAppState();
jest.mock('react-native/Libraries/AppState/AppState', () => ({ __esModule: true, default: mockAppState }));

function loadLayer(token?: string): ReturnType<typeof load> {
  return load(token, mockAppState);
}

function questFull(code: ServerCode | null): ServerCode {
  if (code === null) {
    throw new Error('QUEST_FULL is a code of the main server');
  }
  return code;
}

function names(client: FakeClient): string[] {
  return client.events();
}

afterEach(() => {
  forgetEnvironment();
  jest.restoreAllMocks();
});

describe('app_opened', () => {
  it('is sent once when sending starts, and once at each return to the foreground', () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);

    loaded.moveApp('background');
    loaded.moveApp('active');
    loaded.moveApp('inactive');
    loaded.moveApp('active');
    // Not a return: the app was already in the foreground.
    loaded.moveApp('active');

    expect(names(client)).toEqual(['app_opened', 'app_opened', 'app_opened']);
  });

  it('is not sent at a return to the foreground while the switch is off', () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);
    loaded.usage.allowUsage(false);
    loaded.moveApp('background');
    loaded.moveApp('active');
    expect(names(client)).toEqual([]);
  });
});

describe('screen_viewed', () => {
  it("holds the route's pattern with :id, never the value", () => {
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);
    loaded.usage.noteScreen('/room/[questId]');
    loaded.usage.noteScreen('/');
    const screens = client.queue.filter(({ event }) => event === 'screen_viewed');
    expect(screens.map(({ properties }) => properties.route)).toEqual(['/room/:id', '/']);
  });
});

describe('every event', () => {
  it('carries the six common properties and nothing else of its own', () => {
    process.env.EXPO_PUBLIC_RELEASE_TAG = 'snunow/app/26.11.26-1';
    process.env.EXPO_PUBLIC_RELEASE_COMMIT = 'abc123';
    const loaded = loadLayer(TOKEN);
    const client = signIn(loaded);
    loaded.usage.noteScreen('/room/[questId]');
    loaded.usage.track('party_join_failed', {
      how: 'joined_directly',
      reason: 'refused',
      code: questFull(loaded.events.serverCode('QUEST_FULL')),
    });

    const common = {
      source: 'app',
      app_version: '1.0.4',
      release_tag: 'snunow/app/26.11.26-1',
      release_commit: 'abc123',
      runtime_version: 'fingerprint-hash',
      platform: 'ios',
    };
    const captured = client.queue.filter(({ event }) => event !== '$identify');
    expect(captured.map(({ properties }) => properties)).toEqual([
      common,
      { route: '/room/:id', ...common },
      { how: 'joined_directly', reason: 'refused', code: 'QUEST_FULL', ...common },
    ]);
  });
});

describe('the registry', () => {
  it('takes a main server code only when it is one word of capitals', () => {
    const { events } = loadLayer(TOKEN);
    expect(events.serverCode('QUEST_FULL')).toBe('QUEST_FULL');
    expect(events.serverCode('Quest full')).toBeNull();
    expect(events.serverCode(null)).toBeNull();
  });

  it('refuses, at type level, a name outside it, a property it does not list and a free string', () => {
    // Checked by the app's type check; run here with no client, so nothing is captured.
    const { usage, events, posthog } = loadLayer();
    // @ts-expect-error -- not an event of the registry
    usage.track('button_pressed');
    // @ts-expect-error -- screen_viewed has no title
    usage.track('screen_viewed', { route: events.scrubbedRoute('/quests'), title: '파티' });
    // @ts-expect-error -- a route is made only by the layer's scrubbing
    usage.track('screen_viewed', { route: '/quests/42' });
    // @ts-expect-error -- app_opened takes no properties
    usage.track('app_opened', { route: events.scrubbedRoute('/') });
    // @ts-expect-error -- visibility is one of two words
    usage.track('party_creation_requested', { visibility: 'friends' });
    // @ts-expect-error -- code is there on refused only
    usage.track('seat_booking_failed', { reason: 'network', code: 'seat_taken' });
    expect(posthog.clients).toEqual([]);
  });
});

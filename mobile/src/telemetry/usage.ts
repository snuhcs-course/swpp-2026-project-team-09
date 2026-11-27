/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import PostHog, { type PostHogOptions, PostHogPersistedProperty } from 'posthog-react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { buildTags } from './build';
import { type CommonProperties, type EventName, type PropertiesOf, scrubbedRoute } from './events';

// The one place that hands usage data to PostHog (README.md, "Usage data"). Nothing is sent, or queued, unless the
// build has `EXPO_PUBLIC_POSTHOG_TOKEN`, a signed-in User is identified, and the phone's copy of the account's consent
// allows it (`allowUsage`). The client is made the first time all three hold, and opted out again the moment one of
// them stops.

// PostHog Cloud US. A constant, not a setting.
export const POSTHOG_HOST = 'https://us.i.posthog.com';

// PostHog's options, each checked against posthog-react-native 4.87.3's own reference (README.md, "Usage data").
// The app has no `PostHogProvider`, so neither touches nor screens are autocaptured: screens are the layer's own
// `screen_viewed`. `disableRemoteConfig` is not set: in 4.87.3 it is a no-op, and remote config is always loaded.
export function usageOptions(): PostHogOptions {
  return {
    host: POSTHOG_HOST,
    // Opted out until the layer opts in, and again after each `reset`.
    defaultOptIn: false,
    // `app_opened` is the layer's own.
    captureAppLifecycleEvents: false,
    preloadFeatureFlags: false,
    disableRemoteFeatureFlags: true,
    sendFeatureFlagEvent: false,
    disableSurveys: true,
    enableSessionReplay: false,
    // Errors go to Sentry, never to PostHog, whatever the project's remote config says.
    errorTracking: { autocapture: false },
    capturePushNotificationSubscriptions: false,
    capturePushNotificationOpened: false,
    disableGeoip: true,
    personProfiles: 'identified_only',
    // The device's properties stay off the person, which has none; they are still on each event.
    setDefaultPersonProperties: false,
    // A batch that fails is not tried again behind the switch's back: a network failure keeps it queued for the next
    // flush, where turning the switch off can still drop it.
    fetchRetryCount: 0,
  };
}

let client: PostHog | null = null;
// The signed-in User's id, while one is identified.
let userId: string | null = null;
// The phone's copy of the account's consent allows usage data.
let allowed = false;
// The position 내 정보's switch was pressed to, while its request is on its way (`holdUsage`). It wins over `allowed`,
// so that a Lobby answer read before the account took the press cannot turn sending back on after the User said no.
let pressed: { chosen: boolean } | null = null;
// The client is opted in, for `identifiedAs`.
let sending = false;
let identifiedAs: string | null = null;
// Each change of `sending`, so that an opt-out's late work does not touch a newer opt-in.
let changes = 0;
let appState: AppStateStatus = AppState.currentState;
let watching = false;

function projectToken(): string {
  return (process.env.EXPO_PUBLIC_POSTHOG_TOKEN ?? '').trim();
}

function common(): CommonProperties {
  const { release_tag, release_commit, runtime_version, app_version, platform } = buildTags();
  return { source: 'app', app_version, release_tag, release_commit, runtime_version, platform };
}

// Sends an event of the registry with exactly its properties, and the six every event carries. Nothing while sending
// is not allowed.
export function track<Name extends EventName>(name: Name, ...properties: PropertiesOf<Name>): void {
  if (!sending || client === null) {
    return;
  }
  client.capture(name, { ...properties[0], ...common() });
}

// At each change of screen, from the root layout: expo-router's pattern, "/room/[questId]", is sent as "/room/:id".
export function noteScreen(pattern: string): void {
  track('screen_viewed', { route: scrubbedRoute(pattern) });
}

// The app coming back to the foreground is an `app_opened`.
function watchAppState(): void {
  if (watching) {
    return;
  }
  watching = true;
  appState = AppState.currentState;
  AppState.addEventListener('change', (next) => {
    const before = appState;
    appState = next;
    if (next === 'active' && (before === 'background' || before === 'inactive')) {
      track('app_opened');
    }
  });
}

// What the client still holds unsent is dropped. In 4.87.3 neither `optOut()` nor `reset()` empties the queue
// (`reset` keeps `PostHogPersistedProperty.Queue` on purpose), so the layer empties it itself.
function dropQueue(held: PostHog): void {
  held.setPersistedProperty(PostHogPersistedProperty.Queue, null);
}

function startSending(token: string, id: string): void {
  if (client === null) {
    client = new PostHog(token, usageOptions());
    // What an earlier run left in its storage, an id and an opt-in, is not this run's: a User whose Session ended
    // while the app was closed is forgotten here. The queue stays, under the ids it was captured with.
    client.reset();
  } else if (identifiedAs !== null && identifiedAs !== id) {
    // The client still holds another User, kept while the switch was off.
    client.reset();
  }
  watchAppState();
  changes += 1;
  void client.optIn();
  client.identify(id);
  identifiedAs = id;
  sending = true;
  track('app_opened');
}

// The switch off: nothing new is captured, and nothing captured before is sent. The User stays identified on the
// client, and is identified again when it is turned on.
function stopSending(held: PostHog): void {
  sending = false;
  changes += 1;
  const off = changes;
  dropQueue(held);
  void held
    .optOut()
    .then(() => {
      // Before the client has read its storage, the queue it reads is dropped once the opt-out holds.
      if (changes === off) {
        dropQueue(held);
      }
    })
    .catch(() => {
      // PostHog's own failures stay inside it.
    });
}

// Brings the client in line with the User and the consent.
function follow(): void {
  const token = projectToken();
  if (token === '') {
    return;
  }
  const id = userId;
  const may = id !== null && (pressed === null ? allowed : pressed.chosen);
  if (may && sending && identifiedAs !== id) {
    // Another User without a sign-out between: the first one is forgotten before the second is identified.
    forgetClientUser();
  }
  if (may && !sending) {
    startSending(token, id);
  } else if (!may && sending && client !== null) {
    stopSending(client);
  }
}

// What was sent for the User is flushed, then the client is reset, which in 4.87.3 clears its persisted ids and its
// opt-in (back to `defaultOptIn: false`) and keeps the queue, so the flush started before it still sends those events
// under the User's own id. Reset also while the switch is off, so that the next User is not merged with this one.
function forgetClientUser(): void {
  identifiedAs = null;
  if (client === null) {
    return;
  }
  if (sending) {
    sending = false;
    changes += 1;
    void client.flush().catch(() => {
      // A flush that fails keeps the queue for the next one.
    });
  }
  client.reset();
}

// Whether the phone's copy of the account's consent allows usage data: it holds the current version with usage
// chosen. Called where that copy is read or written, and at once when 내 정보's switch is pressed.
export function allowUsage(chosen: boolean): void {
  allowed = chosen;
  follow();
}

// At once when 내 정보's switch is pressed: the pressed position holds until the returned function is called, when the
// switch's request was answered (and its answer kept) or failed. A later press replaces the hold, and an earlier
// press's release then changes nothing.
export function holdUsage(chosen: boolean): () => void {
  const hold = { chosen };
  pressed = hold;
  follow();
  return () => {
    if (pressed === hold) {
      pressed = null;
      follow();
    }
  };
}

// At a sign-in and at a start with a kept Session. PostHog's `identify` gets the User id and no person properties.
export function identifyUsageUser(id: string): void {
  userId = id;
  follow();
}

// At a sign-out and at a Session's end. Nothing is sent until the next User is identified and allowed.
export function forgetUsageUser(): void {
  userId = null;
  // The next User's consent comes with their sign-in.
  allowed = false;
  pressed = null;
  forgetClientUser();
}

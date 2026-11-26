/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { PostHogOptions } from 'posthog-react-native';

// The stand-in for `posthog-react-native` that every test runs with (`jest-setup.ts`): no test may send usage data.
// It records the clients the usage layer makes and the calls on them, and models the queue as posthog-react-native
// 4.87.3 does (@posthog/core 1.69.2): an opted-out client queues nothing, `optOut()` only sets the flag and keeps
// what is queued, `reset()` clears the ids and the opt-out back to `defaultOptIn` and keeps the queue, and `flush()`
// sends what is queued. A test reads it through `fakePostHog()`.

export interface Captured {
  event: string;
  distinctId: string;
  properties: Record<string, unknown>;
}

type Properties = Record<string, unknown>;

// The persisted properties the layer touches, by the values the SDK gives them.
const QUEUE = 'queue';

export class FakeClient {
  readonly token: string;
  readonly options: PostHogOptions;
  // Every call, in order, by its method's name.
  readonly calls: [method: string, ...args: unknown[]][] = [];
  queue: Captured[] = [];
  // What a flush sent.
  readonly sent: Captured[] = [];
  private optedOutFlag: boolean | null = null;
  private distinctId = 'anonymous';

  constructor(token: string, options: PostHogOptions = {}) {
    this.token = token;
    this.options = options;
  }

  get optedOut(): boolean {
    return this.optedOutFlag ?? this.options.defaultOptIn === false;
  }

  optIn(): Promise<void> {
    this.calls.push(['optIn']);
    this.optedOutFlag = false;
    return Promise.resolve();
  }

  optOut(): Promise<void> {
    this.calls.push(['optOut']);
    this.optedOutFlag = true;
    return Promise.resolve();
  }

  identify(id: string, properties?: Properties): void {
    this.calls.push(['identify', id, properties]);
    const changed = id !== this.distinctId;
    this.distinctId = id;
    if (changed) {
      this.enqueue('$identify', properties ?? {});
    }
  }

  capture(event: string, properties?: Properties): void {
    this.calls.push(['capture', event, properties]);
    this.enqueue(event, properties ?? {});
  }

  flush(): Promise<void> {
    this.calls.push(['flush']);
    this.sent.push(...this.queue.splice(0));
    return Promise.resolve();
  }

  reset(): void {
    this.calls.push(['reset']);
    this.optedOutFlag = null;
    this.distinctId = 'anonymous';
  }

  setPersistedProperty(key: string, value: unknown): void {
    this.calls.push(['setPersistedProperty', key, value]);
    if (key === QUEUE && value === null) {
      this.queue = [];
    }
  }

  // The events captured, sent or not, by name.
  events(): string[] {
    return [...this.sent, ...this.queue].map(({ event }) => event).filter((event) => event !== '$identify');
  }

  private enqueue(event: string, properties: Properties): void {
    if (this.optedOut) {
      return;
    }
    this.queue.push({ event, distinctId: this.distinctId, properties });
  }
}

export interface FakePostHogModule {
  __esModule: true;
  default: jest.Mock<FakeClient, [string, PostHogOptions?]>;
  PostHogPersistedProperty: { Queue: string; OptedOut: string };
  // The clients made, in order.
  clients: FakeClient[];
}

// A new stand-in, for `jest.mock`'s factory.
export function postHogModule(): FakePostHogModule {
  const clients: FakeClient[] = [];
  const PostHog = jest.fn((token: string, options?: PostHogOptions) => {
    const client = new FakeClient(token, options);
    clients.push(client);
    return client;
  });
  return {
    __esModule: true,
    default: PostHog,
    PostHogPersistedProperty: { Queue: QUEUE, OptedOut: 'opted_out' },
    clients,
  };
}

// The stand-in the code under test was given, in this test's module registry.
export function fakePostHog(): FakePostHogModule {
  return jest.requireMock<FakePostHogModule>('posthog-react-native');
}

// The one client the layer made. Fails when it made none or more.
export function madeClient(posthog: FakePostHogModule): FakeClient {
  const [client, ...more] = posthog.clients;
  if (client === undefined || more.length > 0) {
    throw new Error(`The layer made ${posthog.clients.length} PostHog clients`);
  }
  return client;
}

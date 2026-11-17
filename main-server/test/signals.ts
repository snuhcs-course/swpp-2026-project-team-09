/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { type ClientProxy } from '@nestjs/microservices';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { type Observable } from 'rxjs';
import { inject } from 'vitest';
import { z } from 'zod';

// Matches any text, such as an id or a time, in an expected value. Typed, so that lint lets it into an object.
export const ANY_STRING: unknown = expect.any(String);

// The part of a refusal's body that names it.
export function refused(statusCode: number, code: string): object {
  return { statusCode, code };
}

const signalEventSchema = z.object({
  pattern: z.literal('signal'),
  data: z.object({ userIds: z.array(z.string()).optional(), name: z.string(), payload: z.unknown().optional() }),
});

export type SignalEvent = z.infer<typeof signalEventSchema>['data'];

interface RedisSettings {
  REDIS_HOST: string;
  REDIS_PORT: string;
}

// Watches the signals the main server puts on Redis for the socket servers. NestJS messaging publishes each event on
// a channel named after it.
export class SignalWatcher {
  private readonly redis: Redis;
  private readonly signals: SignalEvent[] = [];

  private constructor({ REDIS_HOST, REDIS_PORT }: RedisSettings) {
    this.redis = new Redis({ host: REDIS_HOST, port: Number(REDIS_PORT) });
    this.redis.on('message', (_channel: string, message: string) => {
      this.signals.push(signalEventSchema.parse(JSON.parse(message)).data);
    });
  }

  // On the Redis of the test settings unless another is given.
  static async start(redis: RedisSettings = inject('settings')): Promise<SignalWatcher> {
    const watcher = new SignalWatcher(redis);
    await watcher.redis.subscribe('signal');
    return watcher;
  }

  // The signals seen so far that name this User.
  for(user: { id: string }): SignalEvent[] {
    return this.signals.filter(({ userIds }) => userIds?.includes(user.id) === true);
  }

  all(): SignalEvent[] {
    return [...this.signals];
  }

  async stop(): Promise<void> {
    await this.redis.quit();
  }
}

// JSON with each object's keys in order, so that a signal and its copy read back from Redis compare equal.
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, inner: unknown) =>
    inner !== null && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).toSorted(([a], [b]) => a.localeCompare(b)))
      : inner,
  );

const published = new WeakMap<ClientProxy, string[]>();

// The signals this server has put on Redis since its first signalsWhile, in order.
function publishedBy(app: INestApplication<Server>): string[] {
  const client = app.get<ClientProxy>('MESSAGING_CLIENT');
  const known = published.get(client);
  if (known !== undefined) {
    return known;
  }
  const signals: string[] = [];
  const emit = client.emit.bind(client);
  client.emit = <TResult>(pattern: unknown, data: unknown): Observable<TResult> => {
    if (pattern === 'signal') {
      signals.push(canonical(data));
    }
    return emit<TResult>(pattern, data);
  };
  published.set(client, signals);
  return signals;
}

// The signals of that name, those names, or every name with null, that the server sends while `act` runs. A server's
// signals reach Redis in order, so two signals of the test's own around `act` leave out those an earlier test sent
// late. Other servers on the same Redis, such as those of the test files running alongside, send signals that fall
// between the two as well, so of those only the ones this server put on Redis are kept.
export async function signalsWhile(
  app: INestApplication<Server>,
  watcher: SignalWatcher,
  names: string | readonly string[] | null,
  act: () => Promise<unknown>,
): Promise<SignalEvent[]> {
  // Imported after startApp, so that it is the same class AppModule registers.
  const { SignalsService } = await import('../src/common/signals.service.js');
  const signals = app.get(SignalsService);
  const own = publishedBy(app);
  const sendMarker = async (): Promise<{ at: number; sent: number }> => {
    const marker = `test-${randomUUID()}`;
    signals.send('everyone', marker);
    const sent = own.lastIndexOf(canonical({ name: marker }));
    const at = await vi.waitFor(() => {
      const index = watcher.all().findIndex((signal) => signal.name === marker);
      expect(index).not.toBe(-1);
      return index;
    });
    return { at, sent };
  };
  const start = await sendMarker();
  await act();
  const end = await sendMarker();
  const ours = own.slice(start.sent + 1, end.sent);
  return watcher
    .all()
    .slice(start.at + 1, end.at)
    .filter((signal) => {
      const at = ours.indexOf(canonical(signal));
      if (at === -1) {
        return false;
      }
      ours.splice(at, 1);
      return true;
    })
    .filter((signal) => names === null || [names].flat().includes(signal.name));
}

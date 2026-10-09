/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
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

// The signals named `name` that the server sends while `act` runs. A server's signals reach Redis in order, so two
// signals of the test's own around `act` leave out those an earlier test sent late. Signals that other test files'
// servers send to the same Redis can fall between the two, so a test that checks that none is sent gives its server
// and the watcher a Redis of their own.
export async function signalsWhile(
  app: INestApplication<Server>,
  watcher: SignalWatcher,
  name: string,
  act: () => Promise<unknown>,
): Promise<SignalEvent[]> {
  // Imported after startApp, so that it is the same class AppModule registers.
  const { SignalsService } = await import('../src/common/signals.service.js');
  const signals = app.get(SignalsService);
  const sendMarker = (): Promise<number> => {
    const marker = `test-${randomUUID()}`;
    signals.send('everyone', marker);
    return vi.waitFor(() => {
      const at = watcher.all().findIndex((signal) => signal.name === marker);
      expect(at).not.toBe(-1);
      return at;
    });
  };
  const start = await sendMarker();
  await act();
  const end = await sendMarker();
  return watcher
    .all()
    .slice(start + 1, end)
    .filter((signal) => signal.name === name);
}

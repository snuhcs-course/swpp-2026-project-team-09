import { Redis } from 'ioredis';
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

// Watches the signals the main server puts on Redis for the socket servers. NestJS messaging publishes each event on
// a channel named after it.
export class SignalWatcher {
  private readonly redis: Redis;
  private readonly signals: SignalEvent[] = [];

  private constructor() {
    const settings = inject('settings');
    this.redis = new Redis({ host: settings.REDIS_HOST, port: Number(settings.REDIS_PORT) });
    this.redis.on('message', (_channel: string, message: string) => {
      this.signals.push(signalEventSchema.parse(JSON.parse(message)).data);
    });
  }

  static async start(): Promise<SignalWatcher> {
    const watcher = new SignalWatcher();
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

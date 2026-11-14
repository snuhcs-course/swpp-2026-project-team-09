/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { REDIS } from '../common/redis.module.js';
import { type KeptNotification } from './notification.js';

const LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const MOST_KEPT = 100;

const storedSchema = z.object({
  kind: z.enum(['accepted', 'declined']),
  card: z.object({ kind: z.string(), id: z.string() }),
  at: z.iso.datetime(),
  title: z.string(),
  line: z.string(),
});

// Sets the field only when it is there, so that a replace arriving after a cancel keeps nothing.
const REPLACE_SCRIPT = `
if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 0 then return 0 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return 1`;

function keyOf(userId: string): string {
  return `notifications:${userId}`;
}

function serialize(notification: KeptNotification): string {
  return JSON.stringify({ ...notification, at: notification.at.toISOString() });
}

// Each User's Notifications in one Redis hash, the field being the Notification's identity. The hash is forgotten 7
// days after the last Notification was kept in it.
@Injectable()
export class NotificationStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async keep(userId: string, identity: string, notification: KeptNotification): Promise<void> {
    const key = keyOf(userId);
    await this.redis.multi().hset(key, identity, serialize(notification)).expire(key, LIFETIME_SECONDS).exec();
    if ((await this.redis.hlen(key)) > MOST_KEPT) {
      const dropped = (await this.readAll(userId)).slice(MOST_KEPT).map(({ identity: field }) => field);
      await this.redis.hdel(key, ...dropped);
    }
  }

  async replace(userId: string, identity: string, notification: KeptNotification): Promise<boolean> {
    const replaced = await this.redis.eval(
      REPLACE_SCRIPT,
      1,
      keyOf(userId),
      identity,
      serialize(notification),
      LIFETIME_SECONDS,
    );
    return replaced === 1;
  }

  async forget(userId: string, identity: string): Promise<void> {
    await this.redis.hdel(keyOf(userId), identity);
  }

  // The latest time first.
  async readAll(userId: string): Promise<(KeptNotification & { identity: string })[]> {
    const fields = await this.redis.hgetall(keyOf(userId));
    return Object.entries(fields)
      .map(([identity, value]) => {
        const { kind, card, at, title, line } = storedSchema.parse(JSON.parse(value));
        return { identity, kind, card, at: new Date(at), title, line };
      })
      .toSorted((a, b) => b.at.getTime() - a.at.getTime());
  }
}

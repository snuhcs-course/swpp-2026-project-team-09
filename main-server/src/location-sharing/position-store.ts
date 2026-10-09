// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #42
import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { REDIS } from '../common/redis.module.js';

// A position is replaced every few seconds and no history is kept, so it lives in Redis, not in a table. Redis counts
// the lifetime from when the position was stored.
const POSITION_LIFETIME = 10 * 60 * 1000;

const storedPositionSchema = z.object({ latitude: z.number(), longitude: z.number(), measuredAt: z.string() });

export type StoredPosition = z.infer<typeof storedPositionSchema>;

function keyOf(userId: string): string {
  return `position:${userId}`;
}

// The latest position of each User, only ever one inside the Campus Boundary.
@Injectable()
export class PositionStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async store(userId: string, position: StoredPosition): Promise<void> {
    await this.redis.set(keyOf(userId), JSON.stringify(position), 'PX', POSITION_LIFETIME);
  }

  async clear(userId: string): Promise<void> {
    await this.redis.del(keyOf(userId));
  }

  // The positions stored of the Users named. A User without one is left out.
  async read(userIds: readonly string[]): Promise<Map<string, StoredPosition>> {
    if (userIds.length === 0) {
      return new Map();
    }
    const stored = await this.redis.mget(userIds.map((userId) => keyOf(userId)));
    const positions = new Map<string, StoredPosition>();
    for (const [index, value] of stored.entries()) {
      const userId = userIds[index];
      if (value !== null && userId !== undefined) {
        positions.set(userId, storedPositionSchema.parse(JSON.parse(value)));
      }
    }
    return positions;
  }
}

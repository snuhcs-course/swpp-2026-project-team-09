// AI-generated with Claude Opus 5.5, 2026-09-29 to 2026-10-01, prompted by fyoon46, reviewed by TaeHyun79 in #12
/* oxlint-disable typescript/no-non-null-assertion, typescript/no-unsafe-type-assertion, typescript/no-unsafe-assignment
   -- The store as the documentation writes it, below. */
import { Inject, Injectable } from '@nestjs/common';
import {
  IdempotencyStorage,
  type IdempotencyAcquireResult,
  type IdempotencyStore,
  type IdempotencyStoredPayload,
} from '@nestjs/idempotency';
import { REDIS } from './redis.module.js';

// Keeps the records of @nestjs/idempotency in Redis, as its documentation writes the store:
// https://docs.nestjs.com/reliability/idempotency#store-keys-in-redis-instead
// Each record is a hash at `idem:<scope>:<key>`, where the scope is the User's or the Administrator's id (AppModule),
// and Redis expires it on its own. Each method is one Lua script, which Redis runs atomically, so two requests with the
// same key never both run the handler.

/** The one ioredis method this store needs. */
export interface RedisClient {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
}

// Creates the lock if no record exists. Otherwise returns the record, in the
// same round trip.
const ACQUIRE = `
if redis.call('EXISTS', KEYS[1]) == 0 then
  redis.call('HSET', KEYS[1], 'state', 'in-flight', 'fp', ARGV[1], 'owner', ARGV[2])
  redis.call('PEXPIRE', KEYS[1], ARGV[3])
  return {1}
end
local r = redis.call('HMGET', KEYS[1], 'state', 'fp', 'resp')
return {0, r[1], r[2], r[3]}
`;

// Turns our lock into a completed record, unless another attempt took it over.
const COMPLETE = `
if redis.call('HGET', KEYS[1], 'owner') ~= ARGV[1] then return 0 end
redis.call('HSET', KEYS[1], 'state', 'completed', 'resp', ARGV[2])
redis.call('HDEL', KEYS[1], 'owner')
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return 1
`;

// Deletes the lock, but only if it is still ours.
const RELEASE = `
if redis.call('HGET', KEYS[1], 'owner') == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

// Renews our lock while the handler runs, but only if it is still ours.
const EXTEND = `
if redis.call('HGET', KEYS[1], 'owner') ~= ARGV[1] then return 0 end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1
`;

type AcquireReply = [1] | [0, 'in-flight' | 'completed', string, string | null];

@Injectable()
export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(
    @Inject(REDIS) private readonly redis: RedisClient,
    storage: IdempotencyStorage,
  ) {
    storage.registerSource(this);
  }

  async acquire(key: string, owner: string, fingerprint: string, lockTtl: number): Promise<IdempotencyAcquireResult> {
    const reply = (await this.redis.eval(ACQUIRE, 1, this.key(key), fingerprint, owner, lockTtl)) as AcquireReply;
    if (reply[0] === 1) {
      return { state: 'acquired' };
    }
    const [, state, storedFingerprint, response] = reply;
    return state === 'completed'
      ? { state, fingerprint: storedFingerprint, response: JSON.parse(response!) }
      : { state, fingerprint: storedFingerprint };
  }

  async complete(key: string, owner: string, response: IdempotencyStoredPayload, ttl: number): Promise<boolean> {
    const done = await this.redis.eval(COMPLETE, 1, this.key(key), owner, JSON.stringify(response), ttl);
    return done === 1;
  }

  async release(key: string, owner: string): Promise<boolean> {
    const released = await this.redis.eval(RELEASE, 1, this.key(key), owner);
    return released === 1;
  }

  async extend(key: string, owner: string, lockTtl: number): Promise<boolean> {
    const extended = await this.redis.eval(EXTEND, 1, this.key(key), owner, lockTtl);
    return extended === 1;
  }

  private key(key: string): string {
    return `idem:${key}`;
  }
}

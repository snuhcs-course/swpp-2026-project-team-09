/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Settings } from './settings.js';

// Injection token of the Redis client that keeps records, such as those of repeated requests: @Inject(REDIS).
export const REDIS = 'REDIS';

// Global, so that every feature module can inject the client without importing this module. Messaging has a
// connection of its own (MessagingModule).
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: (settings: ConfigService<Settings, true>): Redis =>
        new Redis({
          host: settings.get('REDIS_HOST', { infer: true }),
          port: settings.get('REDIS_PORT', { infer: true }),
        }),
      inject: [ConfigService],
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  // Runs after the requests in progress have finished and stored their results, so no reply is still due. quit() would
  // wait for Redis to answer, and while Redis cannot be reached it waits behind the commands the client holds for it.
  onApplicationShutdown(): void {
    this.redis.disconnect();
  }
}

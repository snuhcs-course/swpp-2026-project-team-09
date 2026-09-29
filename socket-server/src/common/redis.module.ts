import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Settings } from './settings.js';

export const REDIS = 'REDIS';

// Global, so that every feature module can inject the client without importing this module. Messaging has a
// connection of its own.
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: (settings: ConfigService<Settings, true>): Redis =>
        new Redis({
          host: settings.get('REDIS_HOST', { infer: true }),
          port: settings.get('REDIS_PORT', { infer: true }),
          // UsersGateway reads Redis on every attempt to connect, so a command fails after 1 second instead of waiting
          // for the client to reconnect while Redis cannot be reached.
          commandTimeout: 1000,
        }),
      inject: [ConfigService],
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}

// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #4 #6
import { ConfigService } from '@nestjs/config';
import { RedisOptions, Transport } from '@nestjs/microservices';
import { Settings } from './settings.js';

// NestJS messaging over Redis. The same options receive (main.ts) and check readiness.
export function messagingOptions(settings: ConfigService<Settings, true>): Required<RedisOptions> {
  return {
    transport: Transport.REDIS,
    options: {
      host: settings.get('REDIS_HOST', { infer: true }),
      port: settings.get('REDIS_PORT', { infer: true }),
      // Without retries, Nest stops messaging for good after the first lost connection.
      retryAttempts: Number.POSITIVE_INFINITY,
      retryDelay: 1000,
    },
  };
}

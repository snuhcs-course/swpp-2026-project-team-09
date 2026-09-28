import { ConfigService } from '@nestjs/config';
import { RedisOptions, Transport } from '@nestjs/microservices';
import { Settings } from './settings.js';

// NestJS messaging over Redis. The same options receive (main.ts), send (MessagingModule) and check readiness.
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

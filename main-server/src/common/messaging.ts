import { ConfigService } from '@nestjs/config';
import { RedisOptions, Transport } from '@nestjs/microservices';
import { Settings } from './settings.js';

// Injection token of the client that sends events and requests to the other servers: @Inject(MESSAGING_CLIENT).
export const MESSAGING_CLIENT = 'MESSAGING_CLIENT';

// NestJS messaging over Redis, used both to receive (main.ts) and to send (AppModule).
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

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ConfigService } from '@nestjs/config';
import { RedisOptions, Transport } from '@nestjs/microservices';
import { Settings } from './settings.js';

// NestJS messaging over Redis. The same options send (MessagingModule) and check readiness.
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

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModuleOptionsFactory, RedisOptions, Transport } from '@nestjs/microservices';
import { Settings } from './settings.js';

// NestJS messaging over Redis. The same options receive (main.ts) and send (MessagingModule).
@Injectable()
export class MessagingConfigService implements ClientsModuleOptionsFactory {
  constructor(private readonly settings: ConfigService<Settings, true>) {}

  createClientOptions(): Required<RedisOptions> {
    return {
      transport: Transport.REDIS,
      options: {
        host: this.settings.get('REDIS_HOST', { infer: true }),
        port: this.settings.get('REDIS_PORT', { infer: true }),
        // Without retries, Nest stops messaging for good after the first lost connection.
        retryAttempts: Number.POSITIVE_INFINITY,
        retryDelay: 1000,
      },
    };
  }
}

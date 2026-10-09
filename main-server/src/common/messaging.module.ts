/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Global, Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientsModule } from '@nestjs/microservices';
import { messagingOptions } from './messaging.js';

// Injection token of the client that sends events to the other servers: @Inject(MESSAGING_CLIENT).
export const MESSAGING_CLIENT = 'MESSAGING_CLIENT';

// Global, so that every feature module can inject the client without importing this module.
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([{ name: MESSAGING_CLIENT, useFactory: messagingOptions, inject: [ConfigService] }]),
  ],
  exports: [ClientsModule],
})
export class MessagingModule implements OnApplicationBootstrap {
  constructor(@Inject(MESSAGING_CLIENT) private readonly client: ClientProxy) {}

  // The client would otherwise connect at its first event. Connecting now stops a server that cannot reach Redis.
  async onApplicationBootstrap(): Promise<void> {
    await this.client.connect();
  }
}

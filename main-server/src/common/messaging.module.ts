import { Global, Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { MessagingConfigService } from './messaging-config.service.js';

// Injection token of the client that sends events and requests to the other servers: @Inject(MESSAGING_CLIENT).
export const MESSAGING_CLIENT = 'MESSAGING_CLIENT';

// Global, so that every feature module can inject the client without importing this module.
@Global()
@Module({
  imports: [ClientsModule.registerAsync([{ name: MESSAGING_CLIENT, useClass: MessagingConfigService }])],
  providers: [MessagingConfigService],
  exports: [ClientsModule, MessagingConfigService],
})
export class MessagingModule {}

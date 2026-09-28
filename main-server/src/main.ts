import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { MessagingConfigService } from './common/messaging-config.service.js';
import { Settings } from './common/settings.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // On SIGTERM, finish the requests in progress, close messaging and disconnect the database, then exit.
  app.enableShutdownHooks();
  const settings = app.get<ConfigService<Settings, true>>(ConfigService);
  // Receive events and requests from the other servers.
  app.connectMicroservice(app.get(MessagingConfigService).createClientOptions());
  // Initialize first, so that no message arrives before the database has answered.
  await app.init();
  await app.startAllMicroservices();
  await app.listen(settings.get('PORT', { infer: true }));
}
await bootstrap();

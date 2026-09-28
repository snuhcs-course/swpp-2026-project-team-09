import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { messagingOptions } from './common/messaging.js';
import { Settings } from './common/settings.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const settings = app.get<ConfigService<Settings, true>>(ConfigService);
  // Receive events and requests from the other servers.
  app.connectMicroservice(messagingOptions(settings));
  await app.startAllMicroservices();
  await app.listen(settings.get('PORT', { infer: true }));
}
await bootstrap();

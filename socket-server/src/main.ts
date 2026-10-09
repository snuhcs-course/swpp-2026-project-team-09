/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { messagingOptions } from './common/messaging.js';
import { Settings } from './common/settings.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // On SIGTERM, finish the requests in progress and close messaging, then exit.
  app.enableShutdownHooks();
  const settings = app.get<ConfigService<Settings, true>>(ConfigService);
  // Receive events from the other servers.
  app.connectMicroservice(messagingOptions(settings));
  // Initialize first, so that no message arrives before every module is ready.
  await app.init();
  await app.startAllMicroservices();
  await app.listen(settings.get('PORT', { infer: true }));
}
await bootstrap();

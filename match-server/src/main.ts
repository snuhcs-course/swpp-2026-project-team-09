/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Settings } from './common/settings.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // On SIGTERM, finish the requests in progress and disconnect the database, then exit.
  app.enableShutdownHooks();
  const settings = app.get<ConfigService<Settings, true>>(ConfigService);
  await app.listen(settings.get('PORT', { infer: true }));
}
await bootstrap();

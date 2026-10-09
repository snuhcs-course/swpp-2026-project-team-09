// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #2 #4 #31
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { JSON_BODY_LIMIT } from './common/json-body-limit.js';
import { Settings } from './common/settings.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  // On SIGTERM, finish the requests in progress, close messaging and disconnect the database, then exit.
  app.enableShutdownHooks();
  const settings = app.get<ConfigService<Settings, true>>(ConfigService);
  await app.listen(settings.get('PORT', { infer: true }));
}
await bootstrap();

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

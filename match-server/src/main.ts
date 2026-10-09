// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-10-06, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #8 #45
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

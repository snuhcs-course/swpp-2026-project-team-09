import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MessagingModule } from './common/messaging.module.js';
import { PageFetcherModule } from './common/page-fetcher.module.js';
import { settingsSchema } from './common/settings.js';
import { HealthModule } from './health/health.module.js';
import { MenuModule } from './menu/menu.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Node loads the .env file (see the start scripts), so tests see only the settings they set.
      ignoreEnvFile: true,
      validationSchema: settingsSchema,
    }),
    // Runs the methods marked @Cron(), which start the Collections.
    ScheduleModule.forRoot(),
    MessagingModule,
    PageFetcherModule,
    HealthModule,
    MenuModule,
  ],
})
export class AppModule {}

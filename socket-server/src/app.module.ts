import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { settingsSchema } from './common/settings.js';
import { HealthModule } from './health/health.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Node loads the .env file (see the start scripts), so tests see only the settings they set.
      ignoreEnvFile: true,
      validationSchema: settingsSchema,
    }),
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}

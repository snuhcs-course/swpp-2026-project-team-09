import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { settingsSchema } from './common/settings.js';
import { HealthModule } from './health/health.module.js';
import { ShuttleModule } from './shuttle/shuttle.module.js';
import { SignalsModule } from './signals/signals.module.js';
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
    ShuttleModule,
    SignalsModule,
  ],
})
export class AppModule {}

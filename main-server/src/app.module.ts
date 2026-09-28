import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MESSAGING_CLIENT, messagingOptions } from './common/messaging.js';
import { PrismaModule } from './common/prisma.module.js';
import { settingsSchema } from './common/settings.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Node loads the .env file (see the start scripts), so tests see only the settings they set.
      ignoreEnvFile: true,
      validationSchema: settingsSchema,
    }),
    PrismaModule,
    ClientsModule.registerAsync({
      isGlobal: true,
      clients: [{ name: MESSAGING_CLIENT, inject: [ConfigService], useFactory: messagingOptions }],
    }),
    HealthModule,
  ],
})
export class AppModule {}

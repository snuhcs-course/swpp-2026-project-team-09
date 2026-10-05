import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { MainServerGuard } from './common/main-server.guard.js';
import { PrismaModule } from './common/prisma.module.js';
import { settingsSchema } from './common/settings.js';
import { HealthModule } from './health/health.module.js';
import { MatchingModule } from './matching/matching.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Node loads the .env file (see the start scripts), so tests see only the settings they set.
      ignoreEnvFile: true,
      validationSchema: settingsSchema,
    }),
    PrismaModule,
    HealthModule,
    MatchingModule,
  ],
  providers: [
    // Validates a handler parameter against the schema given in its decorator: @Body({ schema: askSchema }).
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
    { provide: APP_GUARD, useClass: MainServerGuard },
  ],
})
export class AppModule {}

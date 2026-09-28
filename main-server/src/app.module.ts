import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { MessagingModule } from './common/messaging.module.js';
import { PrismaModule } from './common/prisma.module.js';
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
    PrismaModule,
    MessagingModule,
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Validates a handler parameter against the schema given in its decorator: @Body({ schema: signInSchema }).
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
  ],
})
export class AppModule {}

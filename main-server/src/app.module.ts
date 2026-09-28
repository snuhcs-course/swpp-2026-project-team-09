import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { IdempotencyModule } from '@nestjs/idempotency';
import { AuthModule } from './auth/auth.module.js';
import { type SignedInUser } from './common/current-user.decorator.js';
import { MessagingModule } from './common/messaging.module.js';
import { PrismaModule } from './common/prisma.module.js';
import { RedisIdempotencyStore } from './common/redis-idempotency.store.js';
import { RedisModule } from './common/redis.module.js';
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
    RedisModule,
    // Makes a handler marked @Idempotent() safe to repeat. Its interceptor must run outside every other global
    // interceptor: one registered by a module imported below runs inside it, but an APP_INTERCEPTOR in the providers
    // of this module would run outside it.
    IdempotencyModule.forRoot({
      // Runs after AccessTokenGuard, so the User is known. Two Users can send the same key without meeting each
      // other's results.
      scope: (request: { user?: SignedInUser }) => request.user?.id,
    }),
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Validates a handler parameter against the schema given in its decorator: @Body({ schema: signInSchema }).
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
    // Registers itself with IdempotencyStorage when Nest creates it.
    RedisIdempotencyStore,
  ],
})
export class AppModule {}

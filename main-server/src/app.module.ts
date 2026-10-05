import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { IdempotencyModule } from '@nestjs/idempotency';
import { AdministratorsModule } from './administrators/administrators.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CollectionModule } from './collection/collection.module.js';
import { CampusBoundaryModule } from './common/campus-boundary.module.js';
import { type SignedInAdministrator } from './common/current-administrator.decorator.js';
import { type SignedInUser } from './common/current-user.decorator.js';
import { MessagingModule } from './common/messaging.module.js';
import { PrismaModule } from './common/prisma.module.js';
import { RedisIdempotencyStore } from './common/redis-idempotency.store.js';
import { RedisModule } from './common/redis.module.js';
import { settingsSchema } from './common/settings.js';
import { SignalsModule } from './common/signals.module.js';
import { FriendsModule } from './friends/friends.module.js';
import { GlobalEventsModule } from './global-events/global-events.module.js';
import { HealthModule } from './health/health.module.js';
import { InviteLinksModule } from './invite-links/invite-links.module.js';
import { LobbyModule } from './lobby/lobby.module.js';
import { LocationSharingModule } from './location-sharing/location-sharing.module.js';
import { MatchingModule } from './matching/matching.module.js';
import { MenusModule } from './menus/menus.module.js';
import { PlacesModule } from './places/places.module.js';
import { QuestsModule } from './quests/quests.module.js';
import { ShuttleModule } from './shuttle/shuttle.module.js';
import { UsersModule } from './users/users.module.js';
import { WalkingRouteModule } from './walking-route/walking-route.module.js';

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
    SignalsModule,
    RedisModule,
    CampusBoundaryModule,
    // Makes a handler marked @Idempotent() safe to repeat. Its interceptor must run outside every other global
    // interceptor: one registered by a module imported below runs inside it, but an APP_INTERCEPTOR in the providers
    // of this module would run outside it.
    IdempotencyModule.forRoot({
      // Runs after the guards, so the User or the Administrator is known. Two of them can send the same key without
      // meeting each other's results.
      scope: (request: { user?: SignedInUser; administrator?: SignedInAdministrator }) =>
        request.user?.id ?? request.administrator?.id,
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    FriendsModule,
    InviteLinksModule,
    AdministratorsModule,
    LobbyModule,
    CollectionModule,
    GlobalEventsModule,
    MenusModule,
    WalkingRouteModule,
    PlacesModule,
    ShuttleModule,
    QuestsModule,
    LocationSharingModule,
    MatchingModule,
  ],
  providers: [
    // Validates a handler parameter against the schema given in its decorator: @Body({ schema: signInSchema }).
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
    // Registers itself with IdempotencyStorage when Nest creates it.
    RedisIdempotencyStore,
  ],
})
export class AppModule {}

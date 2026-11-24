/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-20  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MiddlewareConsumer, Module, NestModule, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { IdempotencyModule } from '@nestjs/idempotency';
import { ScheduleModule } from '@nestjs/schedule';
import { AdministratorsModule } from './administrators/administrators.module.js';
import { AssistantModule } from './assistant/assistant.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CollectionModule } from './collection/collection.module.js';
import { CampusBoundaryModule } from './common/campus-boundary.module.js';
import { type SignedInAdministrator } from './common/current-administrator.decorator.js';
import { type SignedInUser } from './common/current-user.decorator.js';
import { MessagingModule } from './common/messaging.module.js';
import { PrismaModule } from './common/prisma.module.js';
import { RedisIdempotencyStore } from './common/redis-idempotency.store.js';
import { RedisModule } from './common/redis.module.js';
import { RequestContextMiddleware } from './common/request-context.middleware.js';
import { RequestLoggingModule } from './common/request-logging.module.js';
import { settingsSchema } from './common/settings.js';
import { SignalsModule } from './common/signals.module.js';
import { UnexpectedErrorFilter } from './common/unexpected-error.filter.js';
import { FriendsModule } from './friends/friends.module.js';
import { GlobalEventsModule } from './global-events/global-events.module.js';
import { AiKeysModule } from './common/ai-keys.module.js';
import { GlobalSettingsModule } from './global-settings/global-settings.module.js';
import { HealthModule } from './health/health.module.js';
import { InterestsModule } from './interests/interests.module.js';
import { InviteLinksModule } from './invite-links/invite-links.module.js';
import { RoomRequestsModule } from './library/room-requests.module.js';
import { SeatStaysModule } from './library/seat-stays.module.js';
import { LobbyModule } from './lobby/lobby.module.js';
import { LogTestModule } from './log-test/log-test.module.js';
import { LocationSharingModule } from './location-sharing/location-sharing.module.js';
import { MenusModule } from './menus/menus.module.js';
import { NotificationSenderModule } from './notifications/notification-sender.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PartiesModule } from './parties/parties.module.js';
import { PlacesModule } from './places/places.module.js';
import { PlansModule } from './plans/plans.module.js';
import { PushModule } from './push/push.module.js';
import { QuestsModule } from './quests/quests.module.js';
import { ShuttleModule } from './shuttle/shuttle.module.js';
import { StudySpacesModule } from './study-spaces/study-spaces.module.js';
import { TimetableModule } from './timetable/timetable.module.js';
import { TimetableReadingModule } from './timetable-reading/timetable-reading.module.js';
import { TravelModule } from './travel/travel.module.js';
import { TutorialModule } from './tutorial/tutorial.module.js';
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
    // Runs the @Cron jobs, such as the global settings' minute check.
    ScheduleModule.forRoot(),
    AiKeysModule,
    GlobalSettingsModule,
    // Makes a handler marked @Idempotent() safe to repeat. Its interceptor must run outside every other global
    // interceptor: one registered by a module imported below runs inside it, but an APP_INTERCEPTOR in the providers
    // of this module would run outside it.
    IdempotencyModule.forRoot({
      // Runs after the guards, so the User or the Administrator is known. Two of them can send the same key without
      // meeting each other's results.
      scope: (request: { user?: SignedInUser; administrator?: SignedInAdministrator }) =>
        request.user?.id ?? request.administrator?.id,
    }),
    // The request line of a request its handler answered (README.md: Logging), inside the idempotency interceptor.
    RequestLoggingModule,
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
    PartiesModule,
    TimetableModule,
    TimetableReadingModule,
    TravelModule,
    TutorialModule,
    AssistantModule,
    PlansModule,
    RoomRequestsModule,
    SeatStaysModule,
    StudySpacesModule,
    PushModule,
    NotificationsModule,
    NotificationSenderModule,
    InterestsModule,
    LogTestModule,
  ],
  providers: [
    // Validates a handler parameter against the schema given in its decorator: @Body({ schema: signInSchema }).
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
    // Writes the line of a request that ended in an exception, and answers an unexpected one 500 with the request's ID
    // (README.md: Logging).
    { provide: APP_FILTER, useClass: UnexpectedErrorFilter },
    // Registers itself with IdempotencyStorage when Nest creates it.
    RedisIdempotencyStore,
  ],
})
export class AppModule implements NestModule {
  // Every path, including those no route matches: the request's ID and context, before the guards (README.md: Logging).
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Settings } from '../common/settings.js';
import { FriendsModule } from '../friends/friends.module.js';
import { GlobalEventsModule } from '../global-events/global-events.module.js';
import { LocationSharingModule } from '../location-sharing/location-sharing.module.js';
import { MenusModule } from '../menus/menus.module.js';
import { PlacesModule } from '../places/places.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { ShuttleModule } from '../shuttle/shuttle.module.js';
import { TimetableModule } from '../timetable/timetable.module.js';
import { TravelModule } from '../travel/travel.module.js';
import { TutorialModule } from '../tutorial/tutorial.module.js';
import { UsersModule } from '../users/users.module.js';
import { type Model, MODEL_PORT, openRouterModel } from './adapter.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';
import { UserDayService } from './free-time/user-day.service.js';
import { MealPlanService } from './gathering/meal-plan.service.js';
import { type Catalogue, CATALOGUE_FILE, LIBRARY_CATALOGUE, readCatalogue } from './library/catalogue.js';
import { FREE_TIME_PORT, type FreeTimePort, userDayFreeTime } from './library/free-time-port.js';

@Module({
  // QuestsModule gives the clock, by which a message falls in its day, and the recruiting list. FriendsModule and
  // PlacesModule give what the resolvers read, and TimetableModule and TravelModule what the 공강 tools do. UsersModule
  // gives the 소속 the library tools read, and TutorialModule the tutorial getTutorial answers. LocationSharingModule
  // gives the positions a meal's plan may use: those the asker's map shows.
  imports: [
    FriendsModule,
    GlobalEventsModule,
    LocationSharingModule,
    MenusModule,
    PlacesModule,
    QuestsModule,
    ShuttleModule,
    TimetableModule,
    TravelModule,
    TutorialModule,
    UsersModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    UserDayService,
    MealPlanService,
    // The space catalogue is read once, at start; a bad file stops the start.
    { provide: LIBRARY_CATALOGUE, useFactory: (): Promise<Catalogue> => readCatalogue(CATALOGUE_FILE) },
    // The P6 eval world binds a day of its own here.
    {
      provide: FREE_TIME_PORT,
      inject: [UserDayService],
      useFactory: (days: UserDayService): FreeTimePort => userDayFreeTime(days),
    },
    {
      provide: MODEL_PORT,
      inject: [ConfigService],
      useFactory: (settings: ConfigService<Settings, true>): Model =>
        openRouterModel(
          settings.get('OPENROUTER_API_KEY', { infer: true }),
          settings.get('ASSISTANT_MODEL', { infer: true }),
        ),
    },
  ],
  // The making of a Quest from a Plan plans through the same service as the tool and the recalculation.
  exports: [MealPlanService],
})
export class AssistantModule {}

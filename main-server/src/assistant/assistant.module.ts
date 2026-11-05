/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { GlobalEventsModule } from '../global-events/global-events.module.js';
import { MenusModule } from '../menus/menus.module.js';
import { PlacesModule } from '../places/places.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { ShuttleModule } from '../shuttle/shuttle.module.js';
import { TimetableModule } from '../timetable/timetable.module.js';
import { TravelModule } from '../travel/travel.module.js';
import { TutorialModule } from '../tutorial/tutorial.module.js';
import { UsersModule } from '../users/users.module.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';
import { UserDayService } from './free-time/user-day.service.js';
import { MODEL_PORT_PROVIDER } from './model-port.js';
import { type Catalogue, CATALOGUE_FILE, LIBRARY_CATALOGUE, readCatalogue } from './library/catalogue.js';
import { FREE_TIME_PORT, type FreeTimePort, userDayFreeTime } from './library/free-time-port.js';

@Module({
  // QuestsModule gives the clock, by which a message falls in its day, and the recruiting list. FriendsModule and
  // PlacesModule give what the resolvers read, and TimetableModule and TravelModule what the 공강 tools do. UsersModule
  // gives the 소속 the library tools read, and TutorialModule the tutorial getTutorial answers.
  imports: [
    FriendsModule,
    GlobalEventsModule,
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
    // The space catalogue is read once, at start; a bad file stops the start.
    { provide: LIBRARY_CATALOGUE, useFactory: (): Promise<Catalogue> => readCatalogue(CATALOGUE_FILE) },
    // The P6 eval world binds a day of its own here.
    {
      provide: FREE_TIME_PORT,
      inject: [UserDayService],
      useFactory: (days: UserDayService): FreeTimePort => userDayFreeTime(days),
    },
    MODEL_PORT_PROVIDER,
  ],
})
export class AssistantModule {}

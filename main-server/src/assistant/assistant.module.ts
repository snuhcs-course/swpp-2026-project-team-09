/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Settings } from '../common/settings.js';
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
import { type Model, MODEL_PORT, openRouterModel } from './adapter.js';
import { AliasesController } from './aliases/aliases.controller.js';
import { AliasesService } from './aliases/aliases.service.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';
import { UserDayService } from './free-time/user-day.service.js';
import { InductionController } from './induction/induction.controller.js';
import { InductionService } from './induction/induction.service.js';
import { ModelReflector, REFLECTOR, type Reflector } from './induction/reflector.js';
import { type Catalogue, CATALOGUE_FILE, LIBRARY_CATALOGUE, readCatalogue } from './library/catalogue.js';
import { FREE_TIME_PORT, type FreeTimePort, userDayFreeTime } from './library/free-time-port.js';
import { ResolutionEventsService } from './resolution-events.service.js';
import { SUGGESTION_RANDOM, systemRandom } from './suggestions/random.js';
import { SuggestionCandidates } from './suggestions/suggestion-candidates.service.js';
import { SuggestionsController } from './suggestions/suggestions.controller.js';
import { SuggestionsService } from './suggestions/suggestions.service.js';

@Module({
  // QuestsModule gives the clock, by which a message falls in its day, and the recruiting list. FriendsModule and
  // PlacesModule give what the resolvers read, TimetableModule what the grey suggestions do, and TimetableModule and
  // TravelModule what the 공강 tools do. UsersModule gives the 소속 the library tools read, and TutorialModule the
  // tutorial getTutorial answers.
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
  controllers: [AssistantController, AliasesController, SuggestionsController, InductionController],
  providers: [
    AssistantService,
    InductionService,
    ResolutionEventsService,
    UserDayService,
    AliasesService,
    SuggestionsService,
    SuggestionCandidates,
    { provide: SUGGESTION_RANDOM, useFactory: systemRandom },
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
    // The induction's reflector (P07 ticket 07) is the Assistant's model, called offline, unless
    // ASSISTANT_REFLECTOR_MODEL names another.
    {
      provide: REFLECTOR,
      inject: [MODEL_PORT, ConfigService],
      useFactory: (model: Model, settings: ConfigService<Settings, true>): Reflector => {
        const own = settings.get('ASSISTANT_REFLECTOR_MODEL', { infer: true });
        const timeoutMs = settings.get('ASSISTANT_TIMEOUT_MS', { infer: true });
        if (own === '') {
          return new ModelReflector(model, settings.get('ASSISTANT_MODEL', { infer: true }), timeoutMs);
        }
        return new ModelReflector(
          openRouterModel(settings.get('OPENROUTER_API_KEY', { infer: true }), own),
          own,
          timeoutMs,
        );
      },
    },
  ],
})
export class AssistantModule {}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-30  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Settings } from '../common/settings.js';
import { FriendsModule } from '../friends/friends.module.js';
import { TimetableModule } from '../timetable/timetable.module.js';
import { UsersModule } from '../users/users.module.js';
import { ClassQuestsService } from './class-quests.service.js';
import { type Clock, CLOCK, clockWithOffset } from './clock.js';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';
import { JoinRequestsController } from './join-requests.controller.js';
import { JoinRequestsService } from './join-requests.service.js';
import { LeaderService } from './leader.service.js';
import { MatchingQuestsService } from './matching-quests.service.js';
import { QuestsController } from './quests.controller.js';
import { QuestsService } from './quests.service.js';
import { RecruitingService } from './recruiting.service.js';
import { SubQuestsService } from './sub-quests.service.js';

@Module({
  imports: [UsersModule, FriendsModule, TimetableModule],
  controllers: [QuestsController, JoinRequestsController, InvitationsController],
  providers: [
    QuestsService,
    ClassQuestsService,
    SubQuestsService,
    RecruitingService,
    LeaderService,
    JoinRequestsService,
    InvitationsService,
    MatchingQuestsService,
    {
      provide: CLOCK,
      useFactory: (settings: ConfigService<Settings, true>): Clock =>
        clockWithOffset(settings.get('CLOCK_OFFSET_MINUTES', { infer: true })),
      inject: [ConfigService],
    },
  ],
  exports: [QuestsService, RecruitingService, CLOCK, MatchingQuestsService],
})
export class QuestsModule {}

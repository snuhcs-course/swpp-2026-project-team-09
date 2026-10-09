// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #41 #43 #44 #45
import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { TimetableModule } from '../timetable/timetable.module.js';
import { UsersModule } from '../users/users.module.js';
import { ClassQuestsService } from './class-quests.service.js';
import { CLOCK, systemClock } from './clock.js';
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
    { provide: CLOCK, useValue: systemClock },
  ],
  exports: [QuestsService, RecruitingService, CLOCK, MatchingQuestsService],
})
export class QuestsModule {}

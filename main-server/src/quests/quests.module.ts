import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { UsersModule } from '../users/users.module.js';
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
  imports: [UsersModule, FriendsModule],
  controllers: [QuestsController, JoinRequestsController, InvitationsController],
  providers: [
    QuestsService,
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

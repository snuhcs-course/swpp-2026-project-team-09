/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { RoomRequestSyncModule } from '../library/room-request-sync.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PushModule } from '../push/push.module.js';
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
  imports: [UsersModule, FriendsModule, TimetableModule, RoomRequestSyncModule, PushModule, NotificationsModule],
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
  exports: [QuestsService, RecruitingService, InvitationsService, CLOCK, MatchingQuestsService],
})
export class QuestsModule {}

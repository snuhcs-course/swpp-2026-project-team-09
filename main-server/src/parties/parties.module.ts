// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #46 #47
import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { LocationSharingModule } from '../location-sharing/location-sharing.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { UsersModule } from '../users/users.module.js';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';
import { JoinRequestsController } from './join-requests.controller.js';
import { JoinRequestsService } from './join-requests.service.js';
import { LeaderService } from './leader.service.js';
import { PartiesController } from './parties.controller.js';
import { PartiesService } from './parties.service.js';

@Module({
  imports: [UsersModule, QuestsModule, FriendsModule, LocationSharingModule],
  controllers: [PartiesController, JoinRequestsController, InvitationsController],
  providers: [PartiesService, LeaderService, JoinRequestsService, InvitationsService],
})
export class PartiesModule {}

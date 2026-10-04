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
  imports: [UsersModule, QuestsModule, LocationSharingModule, FriendsModule],
  controllers: [PartiesController, JoinRequestsController, InvitationsController],
  providers: [PartiesService, LeaderService, JoinRequestsService, InvitationsService],
})
export class PartiesModule {}

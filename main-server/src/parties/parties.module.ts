/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { LocationSharingModule } from '../location-sharing/location-sharing.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { UsersModule } from '../users/users.module.js';
import { ArrivalsService } from './arrivals.service.js';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';
import { JoinRequestsController } from './join-requests.controller.js';
import { JoinRequestsService } from './join-requests.service.js';
import { LeaderService } from './leader.service.js';
import { PartiesController } from './parties.controller.js';
import { PartiesService } from './parties.service.js';

@Module({
  imports: [UsersModule, QuestsModule, FriendsModule, LocationSharingModule, NotificationsModule],
  controllers: [PartiesController, JoinRequestsController, InvitationsController],
  providers: [PartiesService, LeaderService, JoinRequestsService, InvitationsService, ArrivalsService],
})
export class PartiesModule {}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { AssistantModule } from '../assistant/assistant.module.js';
import { FriendsModule } from '../friends/friends.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PlacesModule } from '../places/places.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { TravelModule } from '../travel/travel.module.js';
import { UsageModule } from '../usage/usage.module.js';
import { UsersModule } from '../users/users.module.js';
import { BetterPlanController } from './better-plan.controller.js';
import { BetterPlanService } from './better-plan.service.js';
import { InvitationCardController } from './invitation-card.controller.js';
import { InvitationCardService } from './invitation-card.service.js';
import { InviteeTimeToLeave } from './invitee-time-to-leave.service.js';
import { LateController } from './late.controller.js';
import { LateService } from './late.service.js';
import { OwnWayReader } from './own-way-reader.service.js';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';

@Module({
  imports: [
    AssistantModule,
    FriendsModule,
    PlacesModule,
    QuestsModule,
    TravelModule,
    NotificationsModule,
    UsersModule,
    UsageModule,
  ],
  controllers: [PlansController, InvitationCardController, LateController, BetterPlanController],
  providers: [PlansService, InvitationCardService, OwnWayReader, LateService, BetterPlanService, InviteeTimeToLeave],
})
export class PlansModule {}

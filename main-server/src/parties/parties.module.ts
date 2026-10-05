import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { LocationSharingModule } from '../location-sharing/location-sharing.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { UsersModule } from '../users/users.module.js';
import { PartiesController } from './parties.controller.js';
import { PartiesService } from './parties.service.js';

@Module({
  imports: [UsersModule, QuestsModule, FriendsModule, LocationSharingModule],
  controllers: [PartiesController],
  providers: [PartiesService],
})
export class PartiesModule {}

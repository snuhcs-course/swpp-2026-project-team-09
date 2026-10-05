import { Module } from '@nestjs/common';
import { LocationSharingModule } from '../location-sharing/location-sharing.module.js';
import { UsersModule } from '../users/users.module.js';
import { FriendsController } from './friends.controller.js';
import { FriendsService } from './friends.service.js';

@Module({
  imports: [UsersModule, LocationSharingModule],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}

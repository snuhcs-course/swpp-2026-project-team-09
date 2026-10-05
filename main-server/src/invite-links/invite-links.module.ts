import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { AssetLinksController } from './asset-links.controller.js';
import { InviteLinksController } from './invite-links.controller.js';
import { InviteLinksService } from './invite-links.service.js';

@Module({
  imports: [FriendsModule],
  controllers: [InviteLinksController, AssetLinksController],
  providers: [InviteLinksService],
})
export class InviteLinksModule {}

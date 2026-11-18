/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { AssetLinksController } from './asset-links.controller.js';
import { InviteLinksController } from './invite-links.controller.js';
import { InviteLinksService } from './invite-links.service.js';
import { InvitePageController } from './invite-page.controller.js';

@Module({
  imports: [FriendsModule],
  controllers: [InviteLinksController, AssetLinksController, InvitePageController],
  providers: [InviteLinksService],
})
export class InviteLinksModule {}

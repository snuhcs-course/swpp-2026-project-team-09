/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { CollectionModule } from '../collection/collection.module.js';
import { MenusController } from './menus.controller.js';
import { MenusService } from './menus.service.js';

@Module({
  imports: [CollectionModule],
  controllers: [MenusController],
  providers: [MenusService],
  // The Assistant's getMenus tool reads the menus through it.
  exports: [MenusService],
})
export class MenusModule {}

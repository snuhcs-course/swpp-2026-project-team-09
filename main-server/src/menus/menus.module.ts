// AI-generated with Claude Opus 5.5, 2026-10-02, prompted by TaeHyun79, reviewed by fyoon46 in #26
import { Module } from '@nestjs/common';
import { CollectionModule } from '../collection/collection.module.js';
import { MenusController } from './menus.controller.js';
import { MenusService } from './menus.service.js';

@Module({
  imports: [CollectionModule],
  controllers: [MenusController],
  providers: [MenusService],
})
export class MenusModule {}

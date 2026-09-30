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

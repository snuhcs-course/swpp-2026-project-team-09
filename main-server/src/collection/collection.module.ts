import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller.js';
import { CollectionService } from './collection.service.js';

@Module({
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}

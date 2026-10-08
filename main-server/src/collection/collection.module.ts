import { Module } from '@nestjs/common';
import { AdminCollectionController } from './admin-collection.controller.js';
import { CollectionController } from './collection.controller.js';
import { CollectionService } from './collection.service.js';

@Module({
  controllers: [CollectionController, AdminCollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}

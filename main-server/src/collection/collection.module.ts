// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-02 to 2026-10-08, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #26
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

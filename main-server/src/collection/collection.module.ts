/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

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

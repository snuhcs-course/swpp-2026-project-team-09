/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Controller, Get } from '@nestjs/common';
import { AdministratorOnly } from '../common/administrator-only.decorator.js';
import { CollectionService } from './collection.service.js';
import { CollectionStatusDto } from './dto/collection-status.dto.js';

@AdministratorOnly()
@Controller('admin/collection-statuses')
export class AdminCollectionController {
  constructor(private readonly collection: CollectionService) {}

  @Get()
  list(): Promise<CollectionStatusDto[]> {
    return this.collection.statuses();
  }
}

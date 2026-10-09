// AI-generated with Claude Opus 5.5, 2026-10-02 to 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #26 #31
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { WorkerOnly } from '../common/worker-only.decorator.js';
import { CollectionService } from './collection.service.js';
import { type CollectionFailedMessage, collectionFailedSchema } from './dto/collection-failed.dto.js';

@Controller('collections')
export class CollectionController {
  constructor(private readonly collection: CollectionService) {}

  @Post('failed')
  @WorkerOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async failed(
    @Body({ schema: collectionFailedSchema }) { source, failedAt, reason }: CollectionFailedMessage,
  ): Promise<void> {
    await this.collection.recordFailure(source, new Date(failedAt), reason);
  }
}

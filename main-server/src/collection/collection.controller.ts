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

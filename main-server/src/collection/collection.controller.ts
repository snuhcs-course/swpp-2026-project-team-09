import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { HANDLED, type Handled, WorkerMessage } from '../common/worker-message.decorator.js';
import { CollectionService } from './collection.service.js';
import { type CollectionFailedMessage, collectionFailedSchema } from './dto/collection-failed.dto.js';

@Controller()
export class CollectionController {
  constructor(private readonly collection: CollectionService) {}

  @MessagePattern('collection-failed')
  async failed(
    @WorkerMessage(collectionFailedSchema) { source, failedAt, reason }: CollectionFailedMessage,
  ): Promise<Handled> {
    await this.collection.recordFailure(source, new Date(failedAt), reason);
    return HANDLED;
  }
}

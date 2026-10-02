import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { HANDLED, type Handled, WorkerMessage } from '../common/worker-message.decorator.js';
import { type EventsCollectedMessage, eventsCollectedSchema } from './dto/events-collected.dto.js';
import {
  type StoredEventPosts,
  type StoredEventPostsMessage,
  storedEventPostsSchema,
} from './dto/stored-event-posts.dto.js';
import { GlobalEventsService } from './global-events.service.js';

// The worker's messages only. P12 adds the Administrator's routes and the User's list.
@Controller()
export class GlobalEventsController {
  constructor(private readonly globalEvents: GlobalEventsService) {}

  @MessagePattern('events-collected')
  async collected(@WorkerMessage(eventsCollectedSchema) message: EventsCollectedMessage): Promise<Handled> {
    await this.globalEvents.storeCollected(message);
    return HANDLED;
  }

  @MessagePattern('stored-event-posts')
  storedPosts(
    @WorkerMessage(storedEventPostsSchema) { postNumbers }: StoredEventPostsMessage,
  ): Promise<StoredEventPosts> {
    return this.globalEvents.storedPosts(postNumbers);
  }
}

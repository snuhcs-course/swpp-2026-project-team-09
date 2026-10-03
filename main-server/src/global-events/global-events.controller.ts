import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { WorkerOnly } from '../common/worker-only.decorator.js';
import { type EventsCollectedMessage, eventsCollectedSchema } from './dto/events-collected.dto.js';
import {
  type StoredEventPostsDto,
  type StoredEventPostsQuestion,
  storedEventPostsSchema,
} from './dto/stored-event-posts.dto.js';
import { GlobalEventsService } from './global-events.service.js';

@Controller('global-events')
export class GlobalEventsController {
  constructor(private readonly globalEvents: GlobalEventsService) {}

  @Post('collected')
  @WorkerOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async collected(@Body({ schema: eventsCollectedSchema }) message: EventsCollectedMessage): Promise<void> {
    await this.globalEvents.storeCollected(message);
  }

  // A question, which stores nothing and answers with what it asks for (README.md: Requests from the worker server).
  @Post('stored-posts')
  @WorkerOnly()
  @HttpCode(HttpStatus.OK)
  storedPosts(
    @Body({ schema: storedEventPostsSchema }) { postNumbers }: StoredEventPostsQuestion,
  ): Promise<StoredEventPostsDto> {
    return this.globalEvents.storedPosts(postNumbers);
  }
}

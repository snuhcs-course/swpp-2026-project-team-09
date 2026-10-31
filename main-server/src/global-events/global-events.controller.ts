/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { type Response } from 'express';
import { WorkerOnly } from '../common/worker-only.decorator.js';
import { CollectedPostsService } from './collected-posts.service.js';
import { type EventsCollectedMessage, eventsCollectedSchema } from './dto/events-collected.dto.js';
import { PublishedGlobalEventDto } from './dto/global-event.dto.js';
import {
  type StoredEventPostsDto,
  type StoredEventPostsQuestion,
  storedEventPostsSchema,
} from './dto/stored-event-posts.dto.js';
import { GlobalEventsService } from './global-events.service.js';
import { PublicationStepService } from './publication-step.service.js';

@Controller('global-events')
export class GlobalEventsController {
  constructor(
    private readonly globalEvents: GlobalEventsService,
    private readonly collectedPosts: CollectedPostsService,
    private readonly publicationStep: PublicationStepService,
  ) {}

  @Get()
  listPublished(): Promise<PublishedGlobalEventDto[]> {
    return this.globalEvents.listPublished();
  }

  @Post('collected')
  @WorkerOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async collected(
    @Body({ schema: eventsCollectedSchema }) message: EventsCollectedMessage,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.collectedPosts.store(message);
    // Nothing is published inside the request, which the worker waits for only five seconds.
    response.once('close', () => {
      void this.publicationStep.run(message.source);
    });
  }

  // A question, which stores nothing and answers with what it asks for (README.md: Requests from the worker server).
  @Post('stored-posts')
  @WorkerOnly()
  @HttpCode(HttpStatus.OK)
  storedPosts(
    @Body({ schema: storedEventPostsSchema }) question: StoredEventPostsQuestion,
  ): Promise<StoredEventPostsDto> {
    return this.collectedPosts.storedPosts(question);
  }
}

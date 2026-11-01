/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { z } from 'zod';
import { AdministratorOnly } from '../common/administrator-only.decorator.js';
import {
  type CreateGlobalEventDto,
  createGlobalEventSchema,
  type EditGlobalEventDto,
  editGlobalEventSchema,
  type StateChangeDto,
  stateChangeSchema,
} from './dto/change-global-event.dto.js';
import {
  type AttachQueuedDto,
  attachQueuedSchema,
  type LinkedSessionDto,
  type QueuedSessionDto,
} from './dto/same-event-queue.dto.js';
import {
  GlobalEventDetailDto,
  ListedGlobalEventDto,
  type ListedState,
  listedStateSchema,
} from './dto/global-event.dto.js';
import { type UnsettledPostDto } from './dto/unsettled-post.dto.js';
import { GlobalEventsService } from './global-events.service.js';
import { PublicationStepService } from './publication-step.service.js';
import { SameEventQueueService } from './same-event-queue.service.js';

@AdministratorOnly()
@Controller('admin/global-events')
export class AdminGlobalEventsController {
  constructor(
    private readonly globalEvents: GlobalEventsService,
    private readonly publicationStep: PublicationStepService,
    private readonly queue: SameEventQueueService,
  ) {}

  @Get()
  list(@Query('state', { schema: listedStateSchema }) state: ListedState): Promise<ListedGlobalEventDto[]> {
    return this.globalEvents.listForAdministrators(state);
  }

  // The posts the step failed on or has not finished with, and those whose Judgement could not be made.
  @Get('unsettled-posts')
  unsettledPosts(): Promise<UnsettledPostDto[]> {
    return this.publicationStep.unsettledPosts();
  }

  // The sessions the same-event step could not decide, with their candidates as they now are.
  @Get('queue')
  queued(): Promise<QueuedSessionDto[]> {
    return this.queue.list();
  }

  @Post('queue/:sessionId/attach')
  @HttpCode(HttpStatus.NO_CONTENT)
  attachQueued(
    @Param('sessionId', { schema: z.uuid() }) sessionId: string,
    @Body({ schema: attachQueuedSchema }) body: AttachQueuedDto,
  ): Promise<void> {
    return this.queue.attach(sessionId, body);
  }

  @Post('queue/:sessionId/publish')
  @HttpCode(HttpStatus.NO_CONTENT)
  publishQueued(
    @Param('sessionId', { schema: z.uuid() }) sessionId: string,
    @Body({ schema: stateChangeSchema }) { version }: StateChangeDto,
  ): Promise<void> {
    return this.queue.publishAsOwn(sessionId, version);
  }

  @Post('sessions/:sessionId/detach')
  @HttpCode(HttpStatus.NO_CONTENT)
  detach(@Param('sessionId', { schema: z.uuid() }) sessionId: string): Promise<void> {
    return this.queue.detach(sessionId);
  }

  // By hand, from an organizer's submission.
  @Post()
  @Idempotent({ required: true })
  create(@Body({ schema: createGlobalEventSchema }) body: CreateGlobalEventDto): Promise<GlobalEventDetailDto> {
    return this.globalEvents.create(body);
  }

  @Get(':id')
  read(@Param('id', { schema: z.uuid() }) id: string): Promise<GlobalEventDetailDto> {
    return this.globalEvents.read(id);
  }

  @Get(':id/sessions')
  linkedSessions(@Param('id', { schema: z.uuid() }) id: string): Promise<LinkedSessionDto[]> {
    return this.queue.linkedSessions(id);
  }

  // An Administrator has looked at what flagged the event.
  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.NO_CONTENT)
  acknowledge(@Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.globalEvents.acknowledge(id);
  }

  @Patch(':id')
  edit(
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: editGlobalEventSchema }) body: EditGlobalEventDto,
  ): Promise<GlobalEventDetailDto> {
    return this.globalEvents.edit(id, body);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: stateChangeSchema }) { version }: StateChangeDto,
  ): Promise<GlobalEventDetailDto> {
    return this.globalEvents.publish(id, version);
  }

  @Post(':id/discard')
  @HttpCode(HttpStatus.OK)
  discard(
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: stateChangeSchema }) { version }: StateChangeDto,
  ): Promise<GlobalEventDetailDto> {
    return this.globalEvents.discard(id, version);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: stateChangeSchema }) { version }: StateChangeDto,
  ): Promise<GlobalEventDetailDto> {
    return this.globalEvents.cancel(id, version);
  }
}

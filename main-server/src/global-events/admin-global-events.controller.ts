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
  GlobalEventDetailDto,
  ListedGlobalEventDto,
  type ListedState,
  listedStateSchema,
} from './dto/global-event.dto.js';
import { GlobalEventsService } from './global-events.service.js';

@AdministratorOnly()
@Controller('admin/global-events')
export class AdminGlobalEventsController {
  constructor(private readonly globalEvents: GlobalEventsService) {}

  @Get()
  list(@Query('state', { schema: listedStateSchema }) state: ListedState): Promise<ListedGlobalEventDto[]> {
    return this.globalEvents.listForAdministrators(state);
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

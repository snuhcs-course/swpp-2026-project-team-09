import { Controller, Get, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { AdministratorOnly } from '../common/administrator-only.decorator.js';
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

  @Get(':id')
  read(@Param('id', { schema: z.uuid() }) id: string): Promise<GlobalEventDetailDto> {
    return this.globalEvents.read(id);
  }
}

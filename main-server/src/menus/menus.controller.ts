import { Controller, Get, Query } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { z } from 'zod';
import { HANDLED, type Handled, WorkerMessage } from '../common/worker-message.decorator.js';
import { type MenusCollectedMessage, menusCollectedSchema } from './dto/menus-collected.dto.js';
import { RestaurantMenusDto } from './dto/restaurant-menus.dto.js';
import { MenusService } from './menus.service.js';

@Controller('menus')
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  @Get()
  find(@Query('date', { schema: z.iso.date() }) date: string): Promise<RestaurantMenusDto[]> {
    return this.menus.findByDate(date);
  }

  @MessagePattern('menus-collected')
  async collected(@WorkerMessage(menusCollectedSchema) message: MenusCollectedMessage): Promise<Handled> {
    await this.menus.store(message);
    return HANDLED;
  }
}

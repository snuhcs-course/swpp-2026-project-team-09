// AI-generated with Claude Opus 5.5, 2026-10-02 to 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #26 #31
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { WorkerOnly } from '../common/worker-only.decorator.js';
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

  @Post('collected')
  @WorkerOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async collected(@Body({ schema: menusCollectedSchema }) message: MenusCollectedMessage): Promise<void> {
    await this.menus.store(message);
  }
}

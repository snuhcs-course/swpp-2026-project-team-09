import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { BuildingsService } from './buildings.service.js';
import { BuildingDto } from './dto/building.dto.js';

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildings: BuildingsService) {}

  @Get()
  list(): Promise<BuildingDto[]> {
    return this.buildings.list();
  }

  @Get('search')
  search(@Query('q', { schema: z.string().trim().min(1) }) text: string): Promise<BuildingDto[]> {
    return this.buildings.search(text);
  }
}

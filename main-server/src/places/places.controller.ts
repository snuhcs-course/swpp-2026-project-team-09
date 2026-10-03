import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { PlacesService } from './places.service.js';
import { PlaceDto } from './dto/place.dto.js';

@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  list(): Promise<PlaceDto[]> {
    return this.places.list();
  }

  @Get('search')
  search(@Query('q', { schema: z.string().trim().min(1) }) text: string): Promise<PlaceDto[]> {
    return this.places.search(text);
  }
}

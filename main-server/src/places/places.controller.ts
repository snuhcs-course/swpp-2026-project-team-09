// AI-generated with Claude Opus 5.5, 2026-10-03 to 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #32 #36
import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { type Position } from '../common/geometry.js';
import { PlaceLookup } from './place-lookup.js';
import { PlacesService } from './places.service.js';
import { type PlaceAtDto, positionQuerySchema } from './dto/place-at.dto.js';
import { PlaceDto } from './dto/place.dto.js';

@Controller('places')
export class PlacesController {
  constructor(
    private readonly places: PlacesService,
    private readonly placeLookup: PlaceLookup,
  ) {}

  @Get()
  list(): Promise<PlaceDto[]> {
    return this.places.list();
  }

  @Get('search')
  search(@Query('q', { schema: z.string().trim().min(1) }) text: string): Promise<PlaceDto[]> {
    return this.places.search(text);
  }

  @Get('at')
  at(@Query({ schema: positionQuerySchema }) position: Position): PlaceAtDto {
    return this.placeLookup.at(position) ?? { place: null, relation: 'none' };
  }
}

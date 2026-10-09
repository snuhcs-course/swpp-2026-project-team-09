// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { Controller, Get } from '@nestjs/common';
import { AdministratorOnly } from '../common/administrator-only.decorator.js';
import { AdminPlaceDto } from './dto/admin-place.dto.js';
import { PlacesService } from './places.service.js';

// The list a User reads, with each Place's origin and outlines, for the admin site, which holds no User's token.
@AdministratorOnly()
@Controller('admin/places')
export class AdminPlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  list(): Promise<AdminPlaceDto[]> {
    return this.places.listForAdministrators();
  }
}

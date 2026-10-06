import { Controller, Get } from '@nestjs/common';
import { AdministratorOnly } from '../common/administrator-only.decorator.js';
import { PlaceDto } from './dto/place.dto.js';
import { PlacesService } from './places.service.js';

// The list a User reads, for the admin site, which holds no User's token.
@AdministratorOnly()
@Controller('admin/places')
export class AdminPlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  list(): Promise<PlaceDto[]> {
    return this.places.list();
  }
}

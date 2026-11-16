/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type PrivateZoneDto, type PrivateZonesDto } from './dto/private-zone.dto.js';
import { PrivateZonesService } from './private-zones.service.js';

@Controller('users/me/private-zones')
export class PrivateZonesController {
  constructor(private readonly zones: PrivateZonesService) {}

  @Get()
  list(@CurrentUser() user: SignedInUser): Promise<PrivateZonesDto> {
    return this.zones.list(user.id);
  }

  // The service checks the body, so that a body of the wrong shape is refused with PRIVATE_ZONE_INVALID.
  @Post()
  add(@CurrentUser() user: SignedInUser, @Body() body: unknown): Promise<PrivateZoneDto> {
    return this.zones.add(user.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.zones.remove(user.id, id);
  }
}

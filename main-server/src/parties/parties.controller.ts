import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type SwitchDto, switchSchema } from '../location-sharing/dto/switch.dto.js';
import { type CreatePartyDto, createPartySchema } from './dto/party-requests.dto.js';
import { ListedPartyDto, PartyDto } from './dto/party.dto.js';
import { PartiesService } from './parties.service.js';

// A repeat of creating or joining is refused as a User in a Party already, so neither takes an Idempotency-Key.
@Controller('parties')
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Post()
  create(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: createPartySchema }) body: CreatePartyDto,
  ): Promise<PartyDto> {
    return this.parties.create(user.id, body);
  }

  @Get()
  list(
    @Query('globalEventId', { schema: z.uuid().optional() }) globalEventId: string | undefined,
  ): Promise<ListedPartyDto[]> {
    return this.parties.list(globalEventId);
  }

  @Get('mine')
  read(@CurrentUser() user: SignedInUser): Promise<PartyDto> {
    return this.parties.read(user.id);
  }

  @Post('mine/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUser() user: SignedInUser): Promise<void> {
    return this.parties.leave(user.id);
  }

  @Put('mine/sharing')
  @HttpCode(HttpStatus.NO_CONTENT)
  setSharing(@CurrentUser() user: SignedInUser, @Body({ schema: switchSchema }) body: SwitchDto): Promise<void> {
    return this.parties.setSharing(user.id, body.on);
  }

  @Post(':partyId/join')
  join(@CurrentUser() user: SignedInUser, @Param('partyId', { schema: z.uuid() }) partyId: string): Promise<PartyDto> {
    return this.parties.join(user.id, partyId);
  }
}

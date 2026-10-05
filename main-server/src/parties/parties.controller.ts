import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type SwitchDto, switchSchema } from '../location-sharing/dto/switch.dto.js';
import { type OpenPartyDto, openPartySchema } from './dto/party-requests.dto.js';
import { PartyDto, VisiblePartyDto } from './dto/party.dto.js';
import { PartiesService } from './parties.service.js';

// A repeat of opening or entering is refused as a User in a Party already, so neither takes an Idempotency-Key.
@Controller('parties')
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Post()
  open(@CurrentUser() user: SignedInUser, @Body({ schema: openPartySchema }) body: OpenPartyDto): Promise<PartyDto> {
    return this.parties.open(user.id, body);
  }

  @Get()
  listVisible(@CurrentUser() user: SignedInUser): Promise<VisiblePartyDto[]> {
    return this.parties.listVisible(user.id);
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

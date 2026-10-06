import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type SwitchDto, switchSchema } from '../location-sharing/dto/switch.dto.js';
import {
  type OpenPartyDto,
  openPartySchema,
  type UpdatePartyDto,
  updatePartySchema,
  type UserIdDto,
  userIdSchema,
} from './dto/party-requests.dto.js';
import { PartyDto, VisiblePartyDto } from './dto/party.dto.js';
import { LeaderService } from './leader.service.js';
import { PartiesService } from './parties.service.js';

// A repeat of opening or entering is refused as a User in a Party already, so neither takes an Idempotency-Key.
@Controller('parties')
export class PartiesController {
  constructor(
    private readonly parties: PartiesService,
    private readonly leader: LeaderService,
  ) {}

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

  @Patch('mine')
  update(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: updatePartySchema }) body: UpdatePartyDto,
  ): Promise<PartyDto> {
    return this.leader.update(user.id, body);
  }

  @Put('mine/leader')
  @HttpCode(HttpStatus.NO_CONTENT)
  handOver(@CurrentUser() user: SignedInUser, @Body({ schema: userIdSchema }) body: UserIdDto): Promise<void> {
    return this.leader.handOver(user.id, body.userId);
  }

  @Delete('mine/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: SignedInUser, @Param('userId', { schema: z.uuid() }) userId: string): Promise<void> {
    return this.leader.remove(user.id, userId);
  }

  // A repeat is refused as a User in no Party, so it takes no Idempotency-Key.
  @Post('mine/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  end(@CurrentUser() user: SignedInUser): Promise<void> {
    return this.leader.end(user.id);
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

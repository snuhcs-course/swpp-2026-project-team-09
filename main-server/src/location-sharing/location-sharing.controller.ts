// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #42
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { PositionDto, UploadedPositionDto, type UploadPositionDto, uploadPositionSchema } from './dto/position.dto.js';
import { type SwitchDto, switchSchema } from './dto/switch.dto.js';
import { LocationSharingService } from './location-sharing.service.js';

@Controller()
export class LocationSharingController {
  constructor(private readonly locationSharing: LocationSharingService) {}

  @Put('users/me/master-switch')
  @HttpCode(HttpStatus.NO_CONTENT)
  setMasterSwitch(@CurrentUser() user: SignedInUser, @Body({ schema: switchSchema }) body: SwitchDto): Promise<void> {
    return this.locationSharing.setMasterSwitch(user.id, body.on);
  }

  // Each upload replaces the one before, so a repeat changes nothing and it takes no Idempotency-Key.
  @Post('positions')
  @HttpCode(HttpStatus.OK)
  upload(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: uploadPositionSchema }) body: UploadPositionDto,
  ): Promise<UploadedPositionDto> {
    return this.locationSharing.upload(user.id, body);
  }

  @Get('positions')
  positions(@CurrentUser() user: SignedInUser): Promise<PositionDto[]> {
    return this.locationSharing.visiblePositions(user.id);
  }
}

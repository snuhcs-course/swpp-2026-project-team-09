/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import {
  type CreateRoomRequestDto,
  createRoomRequestSchema,
  type RoomCompanionDto,
  type RoomInboxDto,
  type RoomRequestDto,
  type RoomResultDto,
  roomResultSchema,
} from './dto/room-request.dto.js';
import { RoomBookingsService } from './room-bookings.service.js';
import { RoomConsentsService } from './room-consents.service.js';
import { RoomRequestsService } from './room-requests.service.js';

// The app's room requests for a 관정 group study room with companions. None of them is a tool of the Assistant.
@Controller('library')
export class RoomRequestsController {
  constructor(
    private readonly requests: RoomRequestsService,
    private readonly consents: RoomConsentsService,
    private readonly bookings: RoomBookingsService,
  ) {}

  // 동의 요청 보내기 on a book card. A repeat would make a second booking party, so it takes an Idempotency-Key.
  @Post('room-requests')
  @Idempotent({ required: true })
  create(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: createRoomRequestSchema }) body: CreateRoomRequestDto,
  ): Promise<RoomRequestDto> {
    return this.requests.create(user.id, body);
  }

  // The requests that ask the User and the User's one-time notices, for the main screen.
  @Get('room-requests')
  inbox(@CurrentUser() user: SignedInUser): Promise<RoomInboxDto> {
    return this.requests.inbox(user.id);
  }

  // What the requester's card polls.
  @Get('room-requests/:id')
  read(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<RoomRequestDto> {
    return this.requests.read(user.id, id);
  }

  // The only reply with a 학번, so that no cache keeps it.
  @Get('room-requests/:id/companions')
  @Header('Cache-Control', 'no-store')
  companions(
    @CurrentUser() user: SignedInUser,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<RoomCompanionDto[]> {
    return this.bookings.companions(user.id, id);
  }

  // A repeat consents again, which changes nothing.
  @Post('room-requests/:id/consent')
  @HttpCode(HttpStatus.OK)
  consent(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<RoomRequestDto> {
    return this.consents.consent(user.id, id);
  }

  // 거절 and 철회.
  @Post('room-requests/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  decline(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.consents.decline(user.id, id);
  }

  @Post('room-requests/:id/result')
  @HttpCode(HttpStatus.NO_CONTENT)
  result(
    @CurrentUser() user: SignedInUser,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: roomResultSchema }) body: RoomResultDto,
  ): Promise<void> {
    return this.bookings.result(user.id, id, body);
  }

  // Takes no body: only that the booking was cancelled on the phone.
  @Post('room-requests/:id/cancelled')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelled(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.bookings.cancelled(user.id, id);
  }

  @Post('room-notices/:id/seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  seen(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.requests.seen(user.id, id);
  }
}

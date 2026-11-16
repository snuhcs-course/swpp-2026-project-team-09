/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Post } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type SeatStayBody, seatStaySchema, type SeatStayDto } from './dto/seat-stay.dto.js';
import { SeatStaysService } from './seat-stays.service.js';

@Controller('library')
export class SeatStaysController {
  constructor(private readonly stays: SeatStaysService) {}

  // After 예약하기 on a seat's card booked it on the library's site. A repeat would hold a second stay, so it takes an
  // Idempotency-Key.
  @Post('seat-stays')
  @Idempotent({ required: true })
  make(@CurrentUser() user: SignedInUser, @Body({ schema: seatStaySchema }) body: SeatStayBody): Promise<SeatStayDto> {
    return this.stays.make(user.id, body);
  }
}

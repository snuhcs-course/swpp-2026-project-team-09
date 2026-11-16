/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type QuestDto } from '../../quests/dto/quest.dto.js';

// A seat the app booked on the library's site (README.md: A seat's stay). The seat and the booking number stay on the
// phone, as every library reply does.

export const seatStaySchema = z.strictObject({
  spaceId: z.string().min(1).max(40),
  date: z.iso.date(),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u),
  minutes: z
    .int()
    .min(1)
    .max(24 * 60),
});

export type SeatStayBody = z.infer<typeof seatStaySchema>;

export interface SeatStayDto {
  // The Quest of the stay, as the User reads any Quest they hold.
  quest: QuestDto;
  // When the User is told to leave for their next item, or null when no leave-by is kept.
  leaveAt: string | null;
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { PARTY_MAX } from '../../assistant/library/booking-rules.js';
import { LIBRARY_KEY_MAX } from '../../assistant/library/library-card.js';
import { RoomRequestStatus } from '../../generated/prisma/client.js';

// The room requests' bodies and replies (README.md: Group study room requests). No reply but the companions one holds
// a 학번 or a registered name: names here are the Users' display names, as a Quest's Holders show them.

export const createRoomRequestSchema = z.union([
  z.strictObject({
    key: z.string().max(LIBRARY_KEY_MAX),
    // The other people of a party of at most 8; more is refused with the party's reason, so the bound here is wider.
    friendIds: z
      .array(z.uuid())
      .min(1)
      .max(PARTY_MAX * 3),
    useDesc: z.string().trim().min(1).max(20).optional(),
  }),
  z.strictObject({
    key: z.string().max(LIBRARY_KEY_MAX),
    questId: z.uuid(),
    useDesc: z.string().trim().min(1).max(20).optional(),
  }),
]);

export type CreateRoomRequestDto = z.infer<typeof createRoomRequestSchema>;

export const roomResultSchema = z.strictObject({ ok: z.boolean(), failedUserId: z.uuid().optional() });

export type RoomResultDto = z.infer<typeof roomResultSchema>;

export interface PersonDto {
  userId: string;
  name: string;
}

export interface RoomConsentDto extends PersonDto {
  // Null until answered, and again after the library did not recognise the companion.
  consented: boolean | null;
}

export interface RoomRequestDto {
  id: string;
  status: RoomRequestStatus;
  questId: string;
  madeForBooking: boolean;
  requester: PersonDto;
  space: { id: string; name: string };
  date: string;
  start: string;
  minutes: number;
  useDesc: string | null;
  // Why it was dissolved.
  reason: string | null;
  // The companion the library did not recognise.
  failed: PersonDto | null;
  // Empty once booked or ended.
  consents: RoomConsentDto[];
}

// A room request that asks the User, for the consent dialog on the main screen.
export interface RoomAskDto {
  requestId: string;
  requester: PersonDto;
  space: { id: string; name: string };
  date: string;
  start: string;
  minutes: number;
  consented: boolean | null;
  // The library did not recognise this User's 학적상 이름 or 학번: asked to check them.
  recheck: boolean;
}

export interface RoomNoticeDto {
  id: string;
  requestId: string;
  text: string;
}

export interface RoomInboxDto {
  asks: RoomAskDto[];
  notices: RoomNoticeDto[];
}

// The only reply with a 학번: the booker's phone sends it to the library and nowhere else.
export interface RoomCompanionDto {
  userId: string;
  registeredName: string;
  studentNumber: string | null;
}

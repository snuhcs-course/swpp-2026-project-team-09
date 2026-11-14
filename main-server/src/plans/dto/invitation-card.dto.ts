/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerLine, type MapScene, type PlacePoint } from '../../assistant/dto/answer.dto.js';
import { latitudeQuerySchema, longitudeQuerySchema } from '../../common/degrees-query.js';
import { type QuestSummaryDto, type SubQuestDto } from '../../quests/dto/quest.dto.js';

// An invitation as the invited User opens it, declared with the same shape in the app. The gathering's and the way's
// times are Korea time with the offset, as an answer's are; the rest as the Quests' routes give them.
export interface InvitationCardDto {
  id: string;
  sentAt: string;
  quest: QuestSummaryDto;
  // The Leader first, then in the order they entered.
  holders: { id: string; name: string }[];
  // In the order of their starts, those without one last.
  steps: Pick<SubQuestDto, 'id' | 'title' | 'startsAt' | 'endsAt' | 'place'>[];
  // The Quest's destination step. Null when no step ahead has a start and a Place of the list.
  gathering: { place: PlacePoint; startAt: string; endAt: string | null } | null;
  // Null when there is no gathering.
  way: OwnWay | null;
}

// The invitee's own way to the gathering. Nothing here is ever sent to anyone else.
export interface OwnWay {
  status: 'ok' | 'unknown' | 'off-campus' | 'busy';
  origin: { place: PlacePoint; basis: 'timetable' | 'location' } | null;
  leaveAt: string | null;
  // Through the Merging Point when they take it.
  walkMinutes: number | null;
  // The gathering's start, or later when they cannot make it.
  arriveAt: string | null;
  meeting: { place: PlacePoint; at: string } | null;
  leaveBy: string | null;
  next: { startAt: string; place: PlacePoint | null } | null;
  // At most two.
  lines: AnswerLine[];
  scene: MapScene;
}

// Where the invitee's phone is now: both or neither.
export const invitationCardQuerySchema = z
  .object({ latitude: latitudeQuerySchema.optional(), longitude: longitudeQuerySchema.optional() })
  .refine(({ latitude, longitude }) => (latitude === undefined) === (longitude === undefined), {
    message: 'Give both latitude and longitude, or neither',
  });

export type InvitationCardQuery = z.infer<typeof invitationCardQuerySchema>;

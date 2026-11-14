/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanPerson } from './assistant-types';
import type { Board } from './types';

// The conditions of the answers of recruiting Quests drawn on the map (main-server `assistant/dto/answer.dto.ts`, the
// same shapes), members of the union `PlanInput`.

// Recruiting Quests the asker could join: those going to a Global Event, or those a search gave. One of the two.
export interface QuestsInput {
  kind: 'quests';
  globalEventId: string | null;
  questIds: string[] | null;
}

// A recruiting Quest the asker would make: for a Global Event at its Place, or for an activity at a Place.
export interface NewQuestInput {
  kind: 'new-quest';
  // YYYY-MM-DD in Korea.
  date: string;
  globalEventId: string | null;
  // Without a Global Event: what the User asked for ("배드민턴"), and the Place they said or the answer chose.
  title: string | null;
  placeId: string | null;
  // HH:MM the User said; null for the earliest everyone can be there.
  time: string | null;
  // The asker first, then the Friends to invite.
  people: PlanPerson[];
  // The Board it is posted on; Hobby when left out.
  board?: Board;
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, ConditionChip, MapScene, PlacePoint, TimeBand } from './assistant-types';

// The main server's `Lookup` (`assistant/dto/answer.dto.ts`), the same shape.

// An answer drawn on the map that has no Plan: where a Place is, the way and the time to it, a Friend, a menu, a day's
// Classes, or the Tutorial Quests in order.
export interface Lookup {
  kind: 'way' | 'friend' | 'menu' | 'day' | 'tutorial';
  // The conditions it used; a Lookup is not recalculated.
  chips: ConditionChip[];
  // At most two, after a day's title.
  lines: AnswerLine[];
  basis: string[];
  scene: MapScene;
  // When a time matters; it has no handles.
  band: TimeBand | null;
  // The card's buttons, the main one first.
  actions: LookupAction[];
  // The list the card shows under the lines: a day's Classes, or the Tutorial Quests in order.
  steps?: LookupStep[];
}

// A row of a Lookup's list: the time at the left ("13:51", or "11:00–11:50" for a Class), and the text at the right.
export interface LookupStep {
  at: string | null;
  text: string;
}

export type LookupAction =
  // 길 안내
  | { kind: 'guide'; to: PlacePoint }
  // A leave-by notification at `at`.
  | { kind: 'remind'; at: string; text: string }
  // 만나고 싶다
  | { kind: 'meet'; userId: string };

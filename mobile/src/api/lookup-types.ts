/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, ConditionChip, MapScene, PlacePoint, TimeBand } from './assistant-types';

// The main server's `Lookup` (`assistant/dto/answer.dto.ts`), the same shape.

// An answer drawn on the map that has no Plan: where a Place is, the way and the time to it, a Friend, or a menu.
export interface Lookup {
  kind: 'way' | 'friend' | 'menu';
  // The conditions it used; a Lookup is not recalculated.
  chips: ConditionChip[];
  // At most two.
  lines: AnswerLine[];
  basis: string[];
  scene: MapScene;
  // When a time matters; it has no handles.
  band: TimeBand | null;
  // The card's buttons, the main one first.
  actions: LookupAction[];
}

export type LookupAction =
  // 길 안내
  | { kind: 'guide'; to: PlacePoint }
  // A leave-by notification at `at`.
  | { kind: 'remind'; at: string; text: string }
  // 만나고 싶다
  | { kind: 'meet'; userId: string };

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from './assistant-types';
import type { LeftOutClass } from './left-out-types';
import type { WithLocationMissing } from './refusal-types';
import type { ReplyStep } from './reply-step-types';
import type { LatLng } from './types';

// What the app knows when the User asks, each part null when it does not know it.
export interface RequestContext extends WithLocationMissing {
  location: LatLng | null;
  // The visible map area.
  viewport: { south: number; west: number; north: number; east: number } | null;
  tapped: { kind: 'place'; placeId: string } | { kind: 'friend'; userId: string } | null;
  // The condition chips of the answer on screen.
  conditions: PlanInput | null;
  // The plan on screen.
  planId: string | null;
  // The plans of the meal answer on screen in its order, which the list and the map number from 1, so that "2번으로
  // 할게" chooses one of them (P05 ticket 51). Left out without a meal answer on screen that says `choosable`.
  planIds?: string[];
  // With steps on screen, for an app that says `answers` (P03 ticket 20): the conditions of every answer of the steps in
  // their order, and the steps whole as the last reply gave them. Left out otherwise; a main server before P05 ticket 73
  // and 74 refuses them.
  answers?: PlanInput[];
  steps?: ReplyStep[];
  // The User's Classes the conversation leaves out, as the latest reply gave them (P01 ticket 40). Left out for none.
  skipped?: LeftOutClass[];
}

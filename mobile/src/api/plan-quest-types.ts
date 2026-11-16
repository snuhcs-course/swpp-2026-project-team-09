/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlacePoint, Plan, PlanInput } from './assistant-types';
import type { LocationMissing } from './refusal-types';
import type { FriendLevel, LatLng, Quest } from './types';

// --- A Plan made into a Quest (POST /plans), as main-server `plans/dto/plan-quest.dto.ts` declares it ---

// The conditions of the answer on screen and the Plan it shows. The server plans again and reads nothing else of it.
export interface MakePlanQuest {
  input: PlanInput;
  planId: string;
  // The Plan's start, as the answer gave it.
  startAt: string;
  // Where the asker is now.
  location: LatLng | null;
  // Why `location` is null, left out when the app does not know, since a main server before P02-13 refuses the key.
  locationMissing?: LocationMissing;
}

// A Friend of the Plan whom the asker was not asked about yet, with the asker's end of the friendship.
export interface AskLevel {
  userId: string;
  name: string;
  level: FriendLevel;
}

export interface PlanQuest {
  // As the asker reads any Quest they hold.
  quest: Quest;
  // One for each Friend of the Plan, in the Plan's order.
  invitations: { id: string; userId: string }[];
  // The Friends to ask how much they usually see, in the Plan's order; none once all were asked.
  askLevels: AskLevel[];
}

// --- After a decline (GET /plans/:questId/better), as main-server `plans/dto/better-plan.dto.ts` declares it ---

// All three are null when the Quest has no step to plan a meal from.
export interface BetterPlan {
  // The Quest's destination step as it stands.
  current: { place: PlacePoint; startAt: string; endAt: string; togetherMinutes: number } | null;
  // The first Plan of the people left when it is elsewhere or at another time and has more minutes together.
  better: Plan | null;
  // Sent back in the making of `changePlanQuest` with the better Plan's id and start.
  input: PlanInput | null;
}

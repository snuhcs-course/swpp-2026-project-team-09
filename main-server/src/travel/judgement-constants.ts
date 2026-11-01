/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The numbers of the judgement, in one table, frozen with the evaluation.

// The shuttle is chosen when it is at least this much faster than walking.
export const SHUTTLE_ADVANTAGE_SECONDS = 3 * 60;

// The User arrives at least this long before something starts, for parties and for meals.
export const ARRIVAL_MARGIN_SECONDS = 60;

// The longest a candidate or a Sub Quest is taken at its own end.
export const LONGEST_TIMED_SECONDS = 3 * 60 * 60;

// The shortest stay at a candidate the User leaves early: no end, longer than LONGEST_TIMED_SECONDS, or ending too late.
export const SHORTEST_STAY_SECONDS = 30 * 60;

// How long a Sub Quest with no end, or longer than LONGEST_TIMED_SECONDS, is busy for.
export const OPEN_SUB_QUEST_SECONDS = 30 * 60;

// How far the nearest Place point reaches when a place is mapped to a Place.
export const NEAREST_PLACE_METRES = 150;

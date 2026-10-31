/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The numbers of the judgement, in one table, frozen with the evaluation.

// The shuttle is chosen when it is at least this much faster than walking.
export const SHUTTLE_ADVANTAGE_SECONDS = 3 * 60;

// The User arrives at least this long before something starts, for parties and for meals.
export const ARRIVAL_MARGIN_SECONDS = 60;

// The longest a candidate or a Sub Quest is taken at its own end.
export const LONGEST_TIMED_SECONDS = 3 * 60 * 60;

// The shortest stay at a candidate with no end, or longer than LONGEST_TIMED_SECONDS.
export const SHORTEST_STAY_SECONDS = 30 * 60;

// How long a Sub Quest with no end, or longer than LONGEST_TIMED_SECONDS, is busy for.
export const OPEN_SUB_QUEST_SECONDS = 30 * 60;

// How far the nearest Place point reaches when a place is mapped to a Place.
export const NEAREST_PLACE_METRES = 150;

// The shortest meal, and the shortest stretch a Friend must share with the User to be free.
export const SHORTEST_MEAL_SECONDS = 15 * 60;

// A meal's start rounds up to the next of these.
export const MEAL_START_STEP_SECONDS = 5 * 60;

// When each meal is served across all Restaurants, in Korea. Breakfast is not handled.
export const MEAL_WINDOWS = {
  lunch: { from: '11:00', to: '14:30' },
  dinner: { from: '17:00', to: '19:30' },
} as const;

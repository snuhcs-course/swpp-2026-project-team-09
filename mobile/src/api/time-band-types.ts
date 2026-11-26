/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A person's lane of a Plan's time band: their busy stretches of the band's day, cut to its range, each saying what it
// is ("302동 수업", "수업", or "일정").
export interface BandLane {
  userId: string;
  name: string;
  busy: { startAt: string; endAt: string; label?: string }[];
}

// A meal's or a meet's Plan band carries one for each of the asker's Friends who are not in the conditions, in the
// order of the asker's Friends, for picking them in the time card (P04 ticket 64): the walking minutes to the Plan's
// place from where they set out for it, by the main server's rule for a picked person, null where that is not known;
// and, when they set out from an item of their day, that item said as a busy stretch's label ("83동 수업"), which an
// older main server leaves out (P04 ticket 68).
export interface OtherLane extends BandLane {
  walkMinutes: number | null;
  after?: string;
}

// One of the asker's Classes left out of a meal's plan (P04 ticket 93): the id of its time, as the input names it,
// and its whole stretch, labelled as a lane's busy stretch. It is in no lane.
export interface SkippedClass {
  id: string;
  startAt: string;
  endAt: string;
  label: string;
}

// The rules a band's handles and whole moves follow (P01 ticket 12): the step, the shortest and the longest length in
// minutes (null for no longest), and the earliest start (null for the range's start).
export interface BandRules {
  stepMinutes: number;
  leastMinutes: number;
  mostMinutes: number | null;
  earliest: string | null;
}

// A Plan's time band: the range drawn, now, the people's lanes, and the span with its words.
export interface TimeBand {
  range: { startAt: string; endAt: string };
  now: string;
  lanes: BandLane[];
  // The asker's Friends not in the conditions, for picking; left out by an older main server.
  others?: OtherLane[];
  // A meal's: the asker's Classes left out of it, in time order; absent for none, and from an older main server.
  skipped?: SkippedClass[];
  startAt: string;
  endAt: string;
  text: string;
  // The app's own, for a seat booking's band, which moves by the library's rules; the main server never sends it, and a
  // band without it moves by a meal's (`MEAL_RULES`).
  rules?: BandRules;
}

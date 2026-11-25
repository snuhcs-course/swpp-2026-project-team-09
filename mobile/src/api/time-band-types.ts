/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
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
// place, null where the asker may not see where the Friend is.
export interface OtherLane extends BandLane {
  walkMinutes: number | null;
}

// A Plan's time band: the range drawn, now, the people's lanes, and the span with its words.
export interface TimeBand {
  range: { startAt: string; endAt: string };
  now: string;
  lanes: BandLane[];
  // The asker's Friends not in the conditions, for picking; left out by an older main server.
  others?: OtherLane[];
  startAt: string;
  endAt: string;
  text: string;
}

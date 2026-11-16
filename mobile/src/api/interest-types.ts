/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// An item of GET /interests: what the User asked to be told about, as said, and the topics it was read as, one to
// three Korean words that events and recruiting Quests are matched on. `createdAt` in ISO 8601.
export interface WatchedInterest {
  id: string;
  words: string;
  topics: string[];
  createdAt: string;
}

// GET /interests/matches: the published events that have not ended and the recruiting Quests that share a topic with
// the User's hashtags or watched interests. `watched` is true for a match of a watched interest, false for a match of a
// hashtag only, which shows on the map and is never told.
export interface InterestMatches {
  globalEvents: { id: string; watched: boolean }[];
  quests: { id: string; watched: boolean }[];
}

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

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A waiting request as grouping sees it.
export interface Candidate {
  id: string;
  hashtags: readonly string[];
  arrivedAt: Date;
}

// The one place that decides who is grouped with whom (README.md: Grouping). It is given the waiting requests of one
// Global Event and size, at least `size` of them, and returns the groups to form, each of exactly `size` of them. The
// requests in no group wait for the next round. Grouping by AI is another provider of this class.
export abstract class Grouping {
  abstract group(requests: readonly Candidate[], size: number): Promise<Candidate[][]>;
}

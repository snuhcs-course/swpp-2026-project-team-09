/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

// Tier 2 of the Place matcher (P07 ticket 01): words that point at Places by someone's say-so rather than by rule. The
// matcher asks each source in turn, a User's own aliases first, then everyone's, then the curated groups, and answers
// the first that has hits, so that what a User taught beats what the team wrote. Only the curated groups exist today;
// the learned sources come with the plan's piece 3. Every hit names a Place id, which the matcher checks against the
// catalog, so an alias can never point at a Place that is not there.

export type AliasSource = 'personal' | 'global' | 'curated';

export interface AliasHit {
  placeId: string;
  // Kept on every hit, so that seeded entries are counted apart from learned ones in every metric.
  source: AliasSource;
}

export interface PlaceAliases {
  // The hits for a query normalised as the matcher normalises it: lower case, no spaces.
  lookup(query: string, userId: string): AliasHit[];
}

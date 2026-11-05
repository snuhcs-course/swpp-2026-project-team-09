/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The random source of the suggestions' exposure draw. A test fixes it: `vi.spyOn(app.get(SUGGESTION_RANDOM), 'next')`.
export const SUGGESTION_RANDOM = 'SUGGESTION_RANDOM';

export interface RandomSource {
  // A number from 0 up to, not including, 1.
  next(): number;
}

export function systemRandom(): RandomSource {
  return { next: () => Math.random() };
}

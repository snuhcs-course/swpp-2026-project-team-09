/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect } from 'react';

// A refusal's offer `location` opens the main screen's explanation of the User's location, which the main screen
// hands over while it is shown.

const explainers = new Set<() => void>();

export function useLocationOffer(explain: () => void): void {
  useEffect(() => {
    explainers.add(explain);
    return (): void => {
      explainers.delete(explain);
    };
  }, [explain]);
}

export function offerLocation(): void {
  for (const explain of explainers) {
    explain();
  }
}

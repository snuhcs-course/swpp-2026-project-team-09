/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A rate of the replay with its n and its 95% Wilson score interval, which stays inside 0 to 1 and is not zero wide
// at 0 or n successes, unlike the normal approximation, at the small n of our gold set and logs (research note 05 §5).

// The normal quantile of a two-sided 95% interval.
const Z95 = 1.959963984540054;

export interface Rate {
  k: number;
  n: number;
  // Null when n is 0.
  value: number | null;
  low: number | null;
  high: number | null;
}

export function rate(k: number, n: number, z = Z95): Rate {
  if (n === 0) {
    return { k, n, value: null, low: null, high: null };
  }
  const p = k / n;
  const squared = z * z;
  const denominator = 1 + squared / n;
  const centre = (p + squared / (2 * n)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / n + squared / (4 * n * n))) / denominator;
  // At 0 or n successes the bound is exactly 0 or 1; computed, it misses by a rounding error.
  return {
    k,
    n,
    value: p,
    low: k === 0 ? 0 : Math.max(0, centre - half),
    high: k === n ? 1 : Math.min(1, centre + half),
  };
}

// A rate as a table shows it: 48.0% [34.8, 61.5] 24/50, or — when n is 0.
export function shown({ k, n, value, low, high }: Rate): string {
  if (value === null || low === null || high === null) {
    return '—';
  }
  return `${(value * 100).toFixed(1)}% [${(low * 100).toFixed(1)}, ${(high * 100).toFixed(1)}] ${k}/${n}`;
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type RunScore } from './run-score.ts';
import { count } from './scorecard.ts';

// What one turn, a request to the Assistant, takes on average: the tokens and the cost beside the accuracy, as a
// downstream reader needs them (research note 10 §3). Null with no turn.
export interface PerTurn {
  inputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
}

export function perTurn({ usage }: RunScore): PerTurn {
  const { turns, tokens, costUsd } = usage;
  const over = (value: number | null): number | null => (turns === 0 || value === null ? null : value / turns);
  return {
    inputTokens: over(tokens.inputTokens),
    cacheReadTokens: over(tokens.cacheReadTokens),
    cacheWriteTokens: over(tokens.cacheWriteTokens),
    outputTokens: over(tokens.outputTokens),
    costUsd: over(costUsd),
  };
}

export function perTurnShown(value: number | null): string {
  return value === null ? '—' : count(Math.round(value));
}

export function costPerTurnShown(value: number | null): string {
  return value === null ? '—' : `USD ${value.toFixed(4)}`;
}

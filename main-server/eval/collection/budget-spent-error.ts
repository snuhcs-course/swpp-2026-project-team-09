/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

export class BudgetSpentError extends Error {
  constructor(budgetUsd: number) {
    super(`The budget of USD ${budgetUsd} is spent`);
  }
}

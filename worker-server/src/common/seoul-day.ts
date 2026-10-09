/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

const HOUR = 60 * 60 * 1000;

// The calendar day in Asia/Seoul, which is UTC+9 all year, `days` after `time`, as YYYY-MM-DD.
export function seoulDay(time: Date, days: number): string {
  return new Date(time.getTime() + (9 + 24 * days) * HOUR).toISOString().slice(0, 10);
}

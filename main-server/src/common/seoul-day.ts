/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// 00:00 in Asia/Seoul, which keeps +09:00 all year, of the day `at` falls on there.
export function startOfSeoulDay(at: Date): Date {
  const day = new Date(at.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return new Date(`${day}T00:00:00+09:00`);
}

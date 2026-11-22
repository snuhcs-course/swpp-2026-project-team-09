/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// On the map the seats' read gives up after this long, so the study answer never says "찾고 있어요" without end; the
// line that says so offers 다시 찾기 (P01 ticket 04). The read itself may still answer later, unheard.
export const SEATS_WAIT_MS = 8_000;

export function withinWait<T>(read: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('The seats took too long'));
    }, ms);
    void read.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

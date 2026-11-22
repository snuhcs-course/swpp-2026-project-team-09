/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { SEATS_WAIT_MS, withinWait } from '@/screens/main/library/seat-booking';

// On the map the seats' read gives up after SEATS_WAIT_MS, so the study answer never waits without end (P01 ticket
// 04).

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('a read within its wait', () => {
  it('gives what the read gives in time', async () => {
    const read = withinWait(Promise.resolve(['7193']), SEATS_WAIT_MS);

    await expect(read).resolves.toEqual(['7193']);
  });

  it('gives up once the wait is over', async () => {
    const never = new Promise<string[]>(() => {
      // A read that never answers.
    });
    const read = withinWait(never, SEATS_WAIT_MS);
    jest.advanceTimersByTime(SEATS_WAIT_MS);

    await expect(read).rejects.toThrow('The seats took too long');
  });

  it('passes on the read’s own failure', async () => {
    await expect(withinWait(Promise.reject(new Error('network')), SEATS_WAIT_MS)).rejects.toThrow('network');
  });
});

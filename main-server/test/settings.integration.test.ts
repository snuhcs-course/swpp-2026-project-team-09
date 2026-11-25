/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { setImmediate as nextTurn } from 'node:timers/promises';
import { inject } from 'vitest';
import { startApp } from './start-app.js';

// settings.unit.test.ts checks each refusal of the schema; this shows that one stops startup, and that the refusal is
// the startup's alone: no promise is left rejected with no handler (5.0/Main's push CI, after PR 578, failed on one).
describe('Settings', () => {
  const settings = inject('settings');

  it('stops startup and names PORT when it is missing', async () => {
    await expect(startApp({ ...settings, PORT: undefined })).rejects.toThrow('PORT');
  });

  it('leaves no rejection unhandled when it stops startup', async () => {
    const unhandled: unknown[] = [];
    const keep = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', keep);
    try {
      await expect(startApp({ ...settings, PORT: undefined })).rejects.toThrow('PORT');
      // Node reports a rejection without a handler once the queue of promise jobs is empty.
      await nextTurn();
    } finally {
      process.off('unhandledRejection', keep);
    }
    expect(unhandled).toEqual([]);
  });
});

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { inject } from 'vitest';
import { startApp } from './start-app.js';

// settings.unit.test.ts checks each refusal of the schema; this shows that one stops startup.
describe('Settings', () => {
  const settings = inject('settings');

  it('stops startup and names PORT when it is missing', async () => {
    await expect(startApp({ ...settings, PORT: undefined })).rejects.toThrow('PORT');
  });
});

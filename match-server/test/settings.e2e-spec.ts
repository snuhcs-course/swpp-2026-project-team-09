/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { startApp } from './start-app.js';

describe('Settings', () => {
  const settings = inject('settings');

  it('stops startup and names PORT when it is missing', async () => {
    await expect(startApp({ ...settings, PORT: undefined })).rejects.toThrow('PORT');
  });

  it('stops startup and names PORT when it is not a port number', async () => {
    await expect(startApp({ ...settings, PORT: 'abc' })).rejects.toThrow('PORT');
  });

  it('stops startup and names DATABASE_URL when it is missing', async () => {
    await expect(startApp({ ...settings, DATABASE_URL: undefined })).rejects.toThrow('DATABASE_URL');
  });

  it('stops startup and names MATCH_SERVER_TOKEN when it is missing', async () => {
    await expect(startApp({ ...settings, MATCH_SERVER_TOKEN: undefined })).rejects.toThrow('MATCH_SERVER_TOKEN');
  });

  it('stops startup and names MATCH_SERVER_TOKEN when it is short enough to guess', async () => {
    await expect(startApp({ ...settings, MATCH_SERVER_TOKEN: 'short' })).rejects.toThrow('MATCH_SERVER_TOKEN');
  });

  it('stops startup and names MAIN_SERVER_URL when it is not an address', async () => {
    await expect(startApp({ ...settings, MAIN_SERVER_URL: 'main-server' })).rejects.toThrow('MAIN_SERVER_URL');
  });

  it.each([undefined, '0', '1.5'])('stops startup and names ROUND_INTERVAL_SECONDS when it is %s', async (interval) => {
    await expect(startApp({ ...settings, ROUND_INTERVAL_SECONDS: interval })).rejects.toThrow('ROUND_INTERVAL_SECONDS');
  });
});

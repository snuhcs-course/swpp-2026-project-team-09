/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-03  Opus 5.5   prompted by fyoon46
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

  it('stops startup and names MAIN_SERVER_URL when it is missing', async () => {
    await expect(startApp({ ...settings, MAIN_SERVER_URL: undefined })).rejects.toThrow('MAIN_SERVER_URL');
  });

  it('stops startup and names MAIN_SERVER_URL when it is not an address', async () => {
    await expect(startApp({ ...settings, MAIN_SERVER_URL: 'main-server' })).rejects.toThrow('MAIN_SERVER_URL');
  });

  it('stops startup and names WORKER_TOKEN when it is missing', async () => {
    await expect(startApp({ ...settings, WORKER_TOKEN: undefined })).rejects.toThrow('WORKER_TOKEN');
  });

  it('stops startup and names WORKER_TOKEN when it is short enough to guess', async () => {
    await expect(startApp({ ...settings, WORKER_TOKEN: 'short' })).rejects.toThrow('WORKER_TOKEN');
  });
});

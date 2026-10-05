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
});

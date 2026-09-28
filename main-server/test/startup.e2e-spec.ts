import { inject } from 'vitest';
import { startApp } from './start-app.js';

// Nothing listens on port 1, so a connection there is refused at once.

describe('Startup', () => {
  const settings = inject('settings');

  it('stops when the database cannot be reached', async () => {
    await expect(startApp({ ...settings, DATABASE_URL: 'postgresql://main:main@127.0.0.1:1/main' })).rejects.toThrow(
      "Can't reach database server",
    );
  });

  it('stops when Redis cannot be reached', async () => {
    await expect(startApp({ ...settings, REDIS_HOST: '127.0.0.1', REDIS_PORT: '1' })).rejects.toThrow(
      'Connection is closed',
    );
  });
});

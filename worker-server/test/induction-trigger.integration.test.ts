/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { MainServerStub } from './main-server.js';
import { startApp } from './start-app.js';

// The nightly start of the main server's induction (P07 ticket 07): one request with the worker's token, and a
// failure logged, not thrown.

describe('The induction trigger', () => {
  it('posts to /assistant/induction with the token, and reports a main server that is down', async () => {
    const mainServer = new MainServerStub();
    const app = await startApp(inject('settings'), { mainServer });
    // Imported after startApp, so that it is the class the app registered.
    const { InductionTrigger } = await import('../src/induction/induction.trigger.js');
    try {
      const trigger = app.get(InductionTrigger);
      await expect(trigger.start()).resolves.toBe(true);
      expect(mainServer.messages).toEqual([{ path: '/assistant/induction', data: {} }]);
      expect(mainServer.tokens).toEqual([`Bearer ${inject('settings').WORKER_TOKEN}`]);

      mainServer.down = true;
      await expect(trigger.start()).resolves.toBe(false);
    } finally {
      await app.close();
    }
  });
});

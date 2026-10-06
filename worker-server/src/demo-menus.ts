import { Logger } from '@nestjs/common';
import { savedMenuMessages } from './menu/saved-menus.js';

// The demo profile's menus: `pnpm demo:menus` sends the saved pages' menus as those of today and the six days after to
// the main server's `/menus/collected`, as a Collection would, and exits with status 1 when one is refused.
async function demoMenus(): Promise<void> {
  const logger = new Logger('DemoMenus');
  const mainServer = process.env['MAIN_SERVER_URL'];
  const token = process.env['WORKER_TOKEN'];
  if (mainServer === undefined || token === undefined) {
    throw new Error('MAIN_SERVER_URL and WORKER_TOKEN must be set');
  }
  for (const message of await savedMenuMessages(new Date())) {
    // oxlint-disable-next-line no-await-in-loop -- one Source at a time, as a Collection runs
    const response = await fetch(new URL('/menus/collected', mainServer), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (response.ok) {
      logger.log(`${message.source}: sent the saved menus of ${message.days.length} days`);
    } else {
      // oxlint-disable-next-line no-await-in-loop -- one Source at a time
      logger.error(`${message.source}: the main server answered ${response.status}: ${await response.text()}`);
      process.exitCode = 1;
    }
  }
}
await demoMenus();

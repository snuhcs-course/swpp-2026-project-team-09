import { INestApplicationContext, Logger } from '@nestjs/common';
import { MENU_SOURCES } from './menu/dto/menus-collected.dto.js';
import { MenuCollector } from './menu/menu.collector.js';

// Runs one Collection of each Source named, one after the other, as the schedule would. Gives whether the main server
// took them all. A collector of another feature adds its Sources here.
export async function collectSources(app: INestApplicationContext, names: string[]): Promise<boolean> {
  const sources = MENU_SOURCES.filter((source) => names.includes(source));
  if (names.length === 0 || sources.length !== new Set(names).size) {
    throw new Error(`Name one or more of: ${MENU_SOURCES.join(', ')}`);
  }
  const logger = new Logger('Collect');
  let allTaken = true;
  for (const source of sources) {
    // oxlint-disable-next-line no-await-in-loop -- one Collection at a time, in the order named
    const taken = await app.get(MenuCollector).collectOne(source);
    logger.log(`${source}: ${taken ? 'taken by the main server' : 'failed, and recorded as failed'}`);
    allTaken &&= taken;
  }
  return allTaken;
}

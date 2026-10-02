import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { collectSources } from './collect-sources.js';

// The command that runs one Collection by hand: `pnpm collect coop_menus`. It starts the worker without its HTTP
// server, collects the Sources named and exits, with status 1 when the main server did not take one of them.
async function collect(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    process.exitCode = (await collectSources(app, process.argv.slice(2))) ? 0 : 1;
  } catch (error) {
    new Logger('Collect').error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}
await collect();

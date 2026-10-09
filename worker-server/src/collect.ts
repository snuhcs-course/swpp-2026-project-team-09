// AI-generated with Claude Opus 5.5, 2026-10-02 to 2026-10-04, prompted by fyoon46 and TaeHyun79, reviewed by fyoon46 in #26 #30
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { collectSources } from './collect-sources.js';

// The command that runs one Collection by hand: `pnpm collect coop_menus`. It starts the worker without its HTTP
// server, collects the Sources named and exits, with status 1 when one of them failed.
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

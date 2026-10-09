/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-02  Opus 5.5   prompted by fyoon46
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplicationContext, Logger } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Collector, Collects } from './common/collector.js';

// Runs one Collection of each Source named, one after the other, as the schedule would. Gives whether they all
// succeeded.
export async function collectSources(app: INestApplicationContext, names: string[]): Promise<boolean> {
  // The command starts the worker with its schedule, which would collect other Sources while the command runs.
  for (const job of app.get(SchedulerRegistry).getCronJobs().values()) {
    void job.stop();
  }
  const collectors = collectorsBySource(app);
  const named = [...collectors].filter(([source]) => names.includes(source));
  if (names.length === 0 || named.length !== new Set(names).size) {
    throw new Error(`Name one or more of: ${[...collectors.keys()].join(', ')}`);
  }
  const logger = new Logger('Collect');
  let allSucceeded = true;
  for (const [source, collector] of named) {
    // oxlint-disable-next-line no-await-in-loop -- one Collection at a time
    const succeeded = await collector.collectOne(source);
    logger.log(`${source}: ${succeeded ? 'succeeded' : 'failed, and recorded as failed'}`);
    allSucceeded &&= succeeded;
  }
  return allSucceeded;
}

function collectorsBySource(app: INestApplicationContext): Map<string, Collector> {
  const discovery = app.get(DiscoveryService);
  return new Map(
    discovery.getProviders({ metadataKey: Collects.KEY }).flatMap((wrapper) => {
      const collector = app.get<Collector>(wrapper.token);
      return (discovery.getMetadataByDecorator(Collects, wrapper) ?? []).map((source) => [source, collector] as const);
    }),
  );
}

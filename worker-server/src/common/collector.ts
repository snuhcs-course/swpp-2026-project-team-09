// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #30 #31
import { Inject, Logger } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { type z } from 'zod';
import { MainServer } from './main-server.js';

// Names the Sources a collector collects, which `pnpm collect` runs with its collectOne(): @Collects(MENU_SOURCES).
export const Collects = DiscoveryService.createDecorator<readonly string[]>();

// The worker's end of a Collection, which every collector extends.
export abstract class Collector {
  // A property, so that a collector's constructor does not have to pass it on.
  @Inject(MainServer) private readonly mainServer!: MainServer;
  protected readonly logger = new Logger(this.constructor.name);

  // One Collection of a Source. Gives whether it succeeded: one that stopped early may have handed over what it read.
  abstract collectOne(source: string): Promise<boolean>;

  // Asks the main server what it holds, as a page is read: the worker keeps nothing.
  protected ask<T>(path: string, question: object, schema: z.ZodType<T>): Promise<T> {
    return this.mainServer.ask(path, question, schema);
  }

  // Ends one Collection of a Source: what it read goes to the main server at `path`, and so does a failure to fetch or
  // read it.
  protected async handOver(
    source: string,
    collectedAt: Date,
    path: string,
    message: Promise<object>,
  ): Promise<boolean> {
    try {
      await this.mainServer.send(path, await message);
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`The Collection of ${source} failed: ${reason}`);
      await this.mainServer.send('/collections/failed', { source, failedAt: collectedAt.toISOString(), reason });
      return false;
    }
  }
}

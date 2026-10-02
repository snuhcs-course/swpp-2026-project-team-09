import { Inject, Logger } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { MESSAGING_CLIENT } from './messaging.module.js';

// Names the Sources a collector collects, which `pnpm collect` runs with its collectOne(): @Collects(MENU_SOURCES).
export const Collects = DiscoveryService.createDecorator<readonly string[]>();

// The worker's end of a Collection, which every collector extends.
export abstract class Collector {
  // A property, so that a collector's constructor does not have to pass the client on.
  @Inject(MESSAGING_CLIENT) private readonly mainServer!: ClientProxy;
  private readonly logger = new Logger(this.constructor.name);

  // One Collection of a Source. Gives whether the main server took what was read.
  abstract collectOne(source: string): Promise<boolean>;

  // Ends one Collection of a Source: what it read goes to the main server, and so does a failure to fetch or read it.
  protected async handOver(
    source: string,
    collectedAt: Date,
    pattern: string,
    message: Promise<object>,
  ): Promise<boolean> {
    try {
      await this.send(pattern, await message);
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`The Collection of ${source} failed: ${reason}`);
      await this.send('collection-failed', { source, failedAt: collectedAt.toISOString(), reason });
      return false;
    }
  }

  protected async send(pattern: string, message: object): Promise<unknown> {
    try {
      return await lastValueFrom(this.mainServer.send(pattern, message));
    } catch (answer) {
      // A refusal arrives as the main server's answer, { status: 'error', message }, not as an Error.
      const problem =
        typeof answer === 'object' && answer !== null && 'message' in answer ? String(answer.message) : String(answer);
      throw new Error(`The main server did not take ${pattern}: ${problem}`, { cause: answer });
    }
  }
}

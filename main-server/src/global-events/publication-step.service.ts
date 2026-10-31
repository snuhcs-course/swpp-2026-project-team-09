/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';
import { GlobalEventState, PublicationRoute, type Source } from '../generated/prisma/client.js';
import { GlobalEventsService } from './global-events.service.js';

// The step after a Collection's answer, which the worker waits for only five seconds.
@Injectable()
export class PublicationStepService {
  private readonly logger = new Logger(PublicationStepService.name);
  private readonly publishes: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly globalEvents: GlobalEventsService,
    settings: ConfigService<Settings, true>,
  ) {
    this.publishes = settings.get('AUTOMATIC_PUBLICATION', { infer: true });
  }

  // Runs the step over every post of the Source not through it: those just stored, and those a failure or a restart
  // left before. Those it fails on wait for the next Collection of the Source. Never rejects.
  async run(source: Source): Promise<void> {
    try {
      const posts = await this.prisma.sourcePost.findMany({ where: { source, stepFinishedAt: null } });
      const published = await this.runOverPosts(posts.map(({ id }) => id));
      if (published) {
        this.globalEvents.signalChanged();
      }
    } catch (error) {
      this.logger.error(`The step after the Collection of ${source} failed: ${String(error)}`);
    }
  }

  // Publishes the sessions of a post that the rules read, and gives whether it published one. An event an
  // Administrator has changed or discarded meanwhile is left as it is. With automatic publication off, every session
  // stays a Draft. The version stays: it counts an Administrator's changes.
  publishPost(sourcePostId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = this.publishes
        ? await tx.globalEvent.updateMany({
            where: {
              state: GlobalEventState.draft,
              version: 1,
              sessions: { some: { sourcePostId, readByRules: true } },
            },
            data: { state: GlobalEventState.published, publicationRoute: PublicationRoute.rule },
          })
        : { count: 0 };
      await tx.sourcePost.update({ where: { id: sourcePostId }, data: { stepFinishedAt: new Date() } });
      return count > 0;
    });
  }

  private async runOverPosts(sourcePostIds: string[]): Promise<boolean> {
    let published = false;
    for (const sourcePostId of sourcePostIds) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- one post at a time, so that one post's failure stops only it
        published = (await this.publishPost(sourcePostId)) || published;
      } catch (error) {
        this.logger.error(`The step failed on Source Post ${sourcePostId}: ${String(error)}`);
      }
    }
    return published;
  }
}

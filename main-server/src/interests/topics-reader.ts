/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { causeOf, type Model, MODEL_PORT } from '../assistant/adapter.js';
import { PrismaService } from '../common/prisma.service.js';
import { type Settings } from '../common/settings.js';
import { askForTopics, type TopicsLimits } from './topics.js';

const IN_USE_MAX = 200;

// Reads the topics of a text with the model, given the topics already in use. It never throws: a missing key, a failed
// call, or an answer of another shape gives no topics.
@Injectable()
export class TopicsReader {
  private readonly logger = new Logger(TopicsReader.name);
  private readonly limits: TopicsLimits;
  private readonly keyConfigured: boolean;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MODEL_PORT) private readonly model: Model,
    settings: ConfigService<Settings, true>,
  ) {
    this.limits = {
      timeoutMs: settings.get('ASSISTANT_TIMEOUT_MS', { infer: true }),
      maxOutputTokens: settings.get('ASSISTANT_MAX_OUTPUT_TOKENS', { infer: true }),
    };
    this.keyConfigured = settings.get('OPENROUTER_API_KEY', { infer: true }) !== '';
  }

  // `inUse` is read from the database when not given.
  async read(text: string, inUse?: readonly string[]): Promise<string[]> {
    if (!this.keyConfigured) {
      return [];
    }
    try {
      return await askForTopics(this.model, text, inUse ?? (await this.inUse()), this.limits);
    } catch (error) {
      this.logger.warn(`Reading topics failed: ${causeOf(error)}`);
      return [];
    }
  }

  // The distinct topics of the watched interests and of the tagged events and Quests, the most used first.
  async inUse(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ topic: string }[]>`
      SELECT topic FROM (
        SELECT unnest(topics) AS topic FROM watched_interests
        UNION ALL SELECT unnest(topics) FROM global_events
        UNION ALL SELECT unnest(topics) FROM quests
      ) used
      GROUP BY topic
      ORDER BY count(*) DESC, topic
      LIMIT ${IN_USE_MAX}`;
    return rows.map(({ topic }) => topic);
  }
}

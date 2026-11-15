/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { GlobalEventState, JoinPolicy, type Prisma } from '../generated/prisma/client.js';
import { notEnded } from '../global-events/global-events.service.js';
import { type Told } from '../notifications/notification.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { QUEST_INCLUDE, toRecruitingQuestDto } from '../quests/dto/quest.dto.js';
import { TopicsReader } from './topics-reader.js';

// The most events, and the most Quests, one step reads.
const PER_STEP = 10;

// A text is asked about at most this many times: a try counts when it is claimed.
export const TOPICS_TRIES = 2;

// Recruiting Quests looked at to find those with a Sub Quest ahead.
const QUESTS_LOOKED_AT = 100;

const UNREAD = {
  topicsTries: { lt: TOPICS_TRIES },
  OR: [{ topicsReadAt: null }, { topics: { isEmpty: true } }],
};

type Tagged = Omit<Told & { kind: 'interest-new' }, 'kind'>;

interface Item {
  tagged: Tagged;
  text: string;
  tries: number;
  // The Users who are never told of it, such as a Quest's own Holders.
  untold: readonly string[];
}

// Reads the topics of the published Global Events and the recruiting Quests that have none yet, and tells each User
// whose watched interest matches what was just read.
@Injectable()
export class TopicsStep {
  private readonly logger = new Logger(TopicsStep.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reader: TopicsReader,
    private readonly notifications: NotificationsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Never throws.
  async run(): Promise<void> {
    try {
      const now = this.clock.now();
      for (const item of [...(await this.events(now)), ...(await this.quests(now))]) {
        // oxlint-disable-next-line no-await-in-loop -- one model call at a time
        await this.read(item, now);
      }
    } catch (error) {
      this.logger.warn(`The topics step failed: ${String(error)}`);
    }
  }

  private async events(now: Date): Promise<Item[]> {
    const events = await this.prisma.globalEvent.findMany({
      where: { state: GlobalEventState.published, ...UNREAD, AND: [notEnded(now)] },
      orderBy: [{ topicsTries: 'asc' }, { startsAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      take: PER_STEP,
    });
    return events.map(({ id, title, description, startsAt, place, topicsTries }) => ({
      tagged: { subject: 'event', id, title, startsAt, placeLabel: place },
      text: `${title}\n${description}`,
      tries: topicsTries,
      untold: [],
    }));
  }

  private async quests(now: Date): Promise<Item[]> {
    const quests = await this.prisma.quest.findMany({
      where: { joinPolicy: { in: [JoinPolicy.open, JoinPolicy.approval] }, board: { not: null }, ...UNREAD },
      include: QUEST_INCLUDE,
      orderBy: [{ topicsTries: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
      take: QUESTS_LOOKED_AT,
    });
    return quests
      .flatMap((quest) => {
        const recruiting = toRecruitingQuestDto(quest, now);
        if (recruiting === null) {
          return [];
        }
        const { startsAt, place } = recruiting.nextSubQuest;
        return [
          {
            tagged: {
              subject: 'quest' as const,
              id: quest.id,
              title: quest.title,
              startsAt: startsAt === null ? null : new Date(startsAt),
              placeLabel: place?.label ?? null,
            },
            text: `${quest.title}\n${quest.description}`,
            tries: quest.topicsTries,
            untold: quest.holders.map(({ user }) => user.id),
          },
        ];
      })
      .slice(0, PER_STEP);
  }

  private async read(item: Item, now: Date): Promise<void> {
    try {
      if (!(await this.claim(item, now))) {
        return;
      }
      const topics = await this.reader.read(item.text);
      if (topics.length === 0) {
        return;
      }
      await this.store(item, { topics });
      await this.tell(item, topics, now);
    } catch (error) {
      this.logger.warn(`Reading the topics of ${item.tagged.subject} ${item.tagged.id} failed: ${String(error)}`);
    }
  }

  // Counts the try before the model is asked, and only when no other server counted it first.
  private async claim({ tagged, tries }: Item, now: Date): Promise<boolean> {
    const where = { id: tagged.id, topicsTries: tries };
    const data = { topicsTries: tries + 1, topicsReadAt: now };
    const { count } =
      tagged.subject === 'event'
        ? await this.prisma.globalEvent.updateMany({ where, data })
        : await this.prisma.quest.updateMany({ where, data });
    return count === 1;
  }

  private async store({ tagged }: Item, data: Prisma.GlobalEventUpdateInput & Prisma.QuestUpdateInput): Promise<void> {
    if (tagged.subject === 'event') {
      await this.prisma.globalEvent.update({ where: { id: tagged.id }, data });
    } else {
      await this.prisma.quest.update({ where: { id: tagged.id }, data });
    }
  }

  // Only a watched interest kept before now is told, never a hashtag.
  private async tell({ tagged, untold }: Item, topics: string[], now: Date): Promise<void> {
    const watchers = await this.prisma.watchedInterest.findMany({
      where: { topics: { hasSome: topics }, createdAt: { lt: now }, userId: { notIn: [...untold] } },
      distinct: ['userId'],
      select: { userId: true },
    });
    await Promise.all(
      watchers.map(({ userId }) =>
        this.notifications.schedule(userId, { kind: 'interest-new', ...tagged }, now).catch((error: unknown) => {
          this.logger.warn(`Telling a User of ${tagged.subject} ${tagged.id} failed: ${String(error)}`);
        }),
      ),
    );
  }
}

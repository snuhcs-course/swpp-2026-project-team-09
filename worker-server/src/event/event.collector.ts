import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { z } from 'zod';
import { Collector, Collects } from '../common/collector.js';
import { PageFetcher } from '../common/page-fetcher.js';
import { seoulDay } from '../common/seoul-day.js';
import {
  type CollectedEvent,
  EVENT_SOURCES,
  type EventSource,
  type EventsCollectedMessage,
} from './dto/events-collected.dto.js';
import { type ListFilter, parseEventListPage } from './event-list-page.parser.js';
import { parseEventPage } from './event-page.parser.js';

// 00:00, 06:00, 12:00 and 18:00. Provisional, until someone has observed when posts appear.
const COLLECTION_TIMES = '0 0 0,6,12,18 * * *';

// The list's date filter runs from today over this many days. Posts appear one to three months before the event.
const LISTED_DAYS = 365;

const EVENTS = 'https://www.snu.ac.kr/snunow/events';

// The main server's answer to `stored-event-posts`.
const storedPostsSchema = z.object({ postNumbers: z.array(z.number()) });

// A day as the list's date filter writes it: 2026.10.02.
function filterDay(time: Date, days: number): string {
  return seoulDay(time, days).replaceAll('-', '.');
}

@Injectable()
@Collects(EVENT_SOURCES)
export class EventCollector extends Collector {
  constructor(private readonly pages: PageFetcher) {
    super();
  }

  @Cron(COLLECTION_TIMES, { timeZone: 'Asia/Seoul' })
  async collect(): Promise<void> {
    await this.collectOne('snu_events');
  }

  collectOne(source: EventSource): Promise<boolean> {
    const now = new Date();
    return this.handOver(source, now, 'events-collected', this.read(source, now));
  }

  // Reads the posts the main server does not store yet. A post is read once: a later edit at the Source is not seen.
  private async read(source: EventSource, now: Date): Promise<EventsCollectedMessage> {
    const listed = await this.readList({ from: filterDay(now, 0), to: filterDay(now, LISTED_DAYS) });
    const answer = await this.send('stored-event-posts', { postNumbers: listed });
    const stored = new Set(storedPostsSchema.parse(answer).postNumbers);
    const events: CollectedEvent[] = [];
    for (const postNumber of listed.filter((post) => !stored.has(post))) {
      // oxlint-disable-next-line no-await-in-loop -- no page is asked for after one that failed, which may be blocked
      events.push(parseEventPage(await this.pages.fetch(`${EVENTS}?md=v&bbsidx=${postNumber}`)));
    }
    return { source, collectedAt: now.toISOString(), events };
  }

  // The post numbers of the list, page by page until a page lists none.
  private async readList(filter: ListFilter): Promise<number[]> {
    const listed = new Set<number>();
    for (let page = 1; ; page += 1) {
      // oxlint-disable-next-line no-await-in-loop -- the list says where it ends only on the page past the end
      const posts = parseEventListPage(await this.pages.fetch(this.listPage(filter, page)), filter);
      if (posts.length === 0) {
        return [...listed];
      }
      // A list that answers a page past its end with an earlier page would be read without end.
      if (posts.every((post) => listed.has(post))) {
        throw new Error(`Page ${page} of the events list repeats the posts before it`);
      }
      for (const post of posts) {
        listed.add(post);
      }
    }
  }

  // The pager's links drop the filter, so each page's address is built here.
  private listPage({ from, to }: ListFilter, page: number): string {
    return `${EVENTS}?sc=y&df=${from}&dt=${to}&page=${page}`;
  }
}

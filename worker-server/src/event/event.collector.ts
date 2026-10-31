/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { load } from 'cheerio';
import { Collector, Collects } from '../common/collector.js';
import { PageFetcher } from '../common/page-fetcher.js';
import {
  type CollectedPost,
  EVENT_LIST_SOURCES,
  type EventListSource,
  type EventsCollectedMessage,
} from './dto/events-collected.dto.js';
import { type StoredEventPostsQuestion, storedEventPostsAnswerSchema } from './dto/stored-event-posts.dto.js';
import { type ListedPost, parseEventListPage } from './event-list-page.parser.js';
import { type EventPost, parseEventPage } from './event-page.parser.js';
import { filterDay, type ListFilter, listPageAddress, postAddress } from './events-list.js';

// 00:00, 06:00, 12:00 and 18:00. Provisional, until someone has observed when posts appear.
const COLLECTION_TIMES = '0 0 0,6,12,18 * * *';

// The list's date filter runs from today over this many days. Posts appear one to three months before the event.
const LISTED_DAYS = 365;

// Posts in a row whose pages are not posts fail the Collection at this many: then the pages have changed, not the posts.
const UNREADABLE_IN_A_ROW = 3;

// The university's firewall answers a blocked request with status 200 and a page that refreshes to its error page.
function isBlockPage(html: string): boolean {
  return load(html)('meta[http-equiv="refresh" i]').attr('content')?.includes('snucert.snu.ac.kr/waf/') ?? false;
}

// A post whose page is not a post, with what the list shows of it, so that it waits as a Draft for an Administrator.
function unreadablePost({ postNumber, title }: ListedPost): EventPost {
  return {
    postNumber,
    sourceUrl: postAddress(postNumber),
    title,
    description: '',
    start: null,
    end: null,
    readFrom: null,
    place: null,
  };
}

function collectedPost({
  postNumber,
  sourceUrl,
  title,
  description,
  start,
  end,
  readFrom,
  place,
}: EventPost): CollectedPost {
  return {
    key: String(postNumber),
    address: sourceUrl,
    title,
    description,
    sessions: [{ number: 1, start, end, readFrom, place }],
  };
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

// The post's event, or why its page is not the post.
function readPost(html: string, postNumber: number): EventPost | Error {
  try {
    return parseEventPage(html, postNumber);
  } catch (error) {
    return asError(error);
  }
}

@Injectable()
@Collects(EVENT_LIST_SOURCES)
export class EventCollector extends Collector {
  constructor(private readonly pages: PageFetcher) {
    super();
  }

  @Cron(COLLECTION_TIMES, { timeZone: 'Asia/Seoul' })
  async collect(): Promise<void> {
    await this.collectOne('snu_events');
  }

  async collectOne(source: EventListSource): Promise<boolean> {
    const now = new Date();
    const message = this.read(source, now);
    const taken = await this.handOver(source, now, '/global-events/collected', message);
    // One that stopped early is handed over all the same, and has failed.
    return taken && (await message).failureReason === null;
  }

  // Reads the posts the main server does not store yet. A post is read once: a later edit at the Source is not seen. What
  // was read before a stop is handed over with why it stopped, so that it is not read again and the Collection fails.
  private async read(source: EventListSource, now: Date): Promise<EventsCollectedMessage> {
    const listed = await this.readList({ from: filterDay(now, 0), to: filterDay(now, LISTED_DAYS) });
    const question: StoredEventPostsQuestion = { source, keys: listed.map(({ postNumber }) => String(postNumber)) };
    const answer = await this.ask('/global-events/stored-posts', question, storedEventPostsAnswerSchema);
    const stored = new Set(answer.keys);
    const { posts, failure } = await this.readPosts(listed.filter(({ postNumber }) => !stored.has(String(postNumber))));
    if (failure !== null) {
      this.logger.error(`The Collection of ${source} stopped: ${failure.message}`);
    }
    return {
      source,
      collectedAt: now.toISOString(),
      failureReason: failure?.message ?? null,
      posts: posts.map((post) => collectedPost(post)),
    };
  }

  private async readList(filter: ListFilter): Promise<ListedPost[]> {
    const listed = new Map<number, ListedPost>();
    for (let page = 1; ; page += 1) {
      // oxlint-disable-next-line no-await-in-loop -- the list says where it ends only on the page past the end
      const posts = parseEventListPage(await this.page(listPageAddress(filter, page)), filter);
      if (posts.length === 0) {
        return [...listed.values()];
      }
      // A list that answers a page past its end with an earlier page would be read without end.
      if (posts.every(({ postNumber }) => listed.has(postNumber))) {
        throw new Error(`Page ${page} of the events list repeats the posts before it`);
      }
      for (const post of posts) {
        listed.set(post.postNumber, post);
      }
    }
  }

  // The posts, one after the other until a page cannot be fetched or is blocked, since more are likely blocked, or until
  // three posts in a row are not posts. A post whose page is not a post is kept back, and sent as unreadable once a post
  // after it is read, or when the list ends and the Collection read a post: one that read none cannot tell an odd post
  // from pages that have changed, so it fails and its posts are read again.
  private async readPosts(listed: ListedPost[]): Promise<{ posts: EventPost[]; failure: Error | null }> {
    const posts: EventPost[] = [];
    let unreadable: EventPost[] = [];
    let problem: Error | null = null;
    for (const post of listed) {
      let html: string;
      try {
        // oxlint-disable-next-line no-await-in-loop -- no page is asked for after one that failed, which may be blocked
        html = await this.page(postAddress(post.postNumber));
      } catch (error) {
        return { posts, failure: asError(error) };
      }
      const read = readPost(html, post.postNumber);
      if (read instanceof Error) {
        this.logger.warn(`Post ${post.postNumber} could not be read: ${read.message}`);
        problem = read;
        unreadable.push(unreadablePost(post));
        if (unreadable.length === UNREADABLE_IN_A_ROW) {
          const failure = `${UNREADABLE_IN_A_ROW} posts in a row could not be read: ${read.message}`;
          return { posts, failure: new Error(failure, { cause: read }) };
        }
      } else {
        posts.push(...unreadable, read);
        unreadable = [];
      }
    }
    if (posts.length === 0 && problem !== null) {
      return { posts, failure: new Error(`No post could be read: ${problem.message}`, { cause: problem }) };
    }
    return { posts: [...posts, ...unreadable], failure: null };
  }

  private async page(url: string): Promise<string> {
    const html = await this.pages.fetch(url);
    if (isBlockPage(html)) {
      throw new Error(`The university's firewall blocked ${url}`);
    }
    return html;
  }
}

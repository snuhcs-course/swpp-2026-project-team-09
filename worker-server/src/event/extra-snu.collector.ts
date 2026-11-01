/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { BrowserPages, type OpenedPage, type OpenPage } from '../common/browser-pages.js';
import { Collector, Collects } from '../common/collector.js';
import { Settings } from '../common/settings.js';
import {
  type CollectedPost,
  type EventsCollectedMessage,
  EXTRA_SNU_SOURCES,
  type ExtraSnuSource,
} from './dto/events-collected.dto.js';
import { type StoredEventPostsQuestion, storedEventPostsAnswerSchema } from './dto/stored-event-posts.dto.js';
import { type ListedProgramme, parseExtraSnuListPage } from './extra-snu-list-page.parser.js';
import { listPageAddress, programmeAddress } from './extra-snu-list.js';
import { maskEmails, parseExtraSnuPage } from './extra-snu-page.parser.js';

// 03:00 and 15:00, midway between the SNU events list's Collections, and clear of the menus' and the shuttle stops'.
const COLLECTION_TIMES = '0 0 3,15 * * *';

// New programmes come first, so the first pages hold those not read yet, and the site is asked for no more than these.
const LISTED_PAGES = 4;

// Programmes in a row whose pages are not programmes fail the Collection at this many: then the pages have changed.
const UNREADABLE_IN_A_ROW = 3;

// Programmes in a row that end up short of their pages fail the Collection at this many: then the waiting room is holding
// every page, and more requests only add to its queue. Fewer may be odd ones, which should not hold up the rest.
const SHORT_OF_THEIR_PAGES_IN_A_ROW = 3;

// Where a programme that needs a sign-in redirects: the university's SSO, or the site's own sign-in page.
function needsSignIn(url: string): boolean {
  const { hostname, pathname } = new URL(url);
  return hostname === 'nsso.snu.ac.kr' || pathname.startsWith('/comm/login/');
}

// Where every programme ends up past the waiting room. A browser that is anywhere else was not let through in time, or
// the programme is an odd one: a next Collection can read it, unlike one stored as unreadable.
function isProgrammePage(url: string): boolean {
  return new URL(url).pathname.endsWith('/findIcmpNsbjtPgmInfo.do');
}

// A browser follows the university's firewall's block page to its error page.
function isBlocked(url: string): boolean {
  return new URL(url).hostname === 'snucert.snu.ac.kr';
}

// A programme whose page is not its page, with what the list shows of it, so that it waits as a Draft for an
// Administrator.
function unreadableProgramme({ key, title }: ListedProgramme): CollectedPost {
  return {
    key,
    address: programmeAddress(key),
    title: maskEmails(title),
    description: '',
    links: [],
    sessions: [{ number: 1, start: null, end: null, readFrom: null, place: null }],
  };
}

function heldBack(url: string): string {
  return `${SHORT_OF_THEIR_PAGES_IN_A_ROW} programmes in a row stopped short of their pages: at ${url}`;
}

function noneRead(problem: Error): Error {
  return new Error(`No programme could be read: ${problem.message}`, { cause: problem });
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

// The programme, or why its page is not the programme.
function readProgramme(html: string, key: string): CollectedPost | Error {
  try {
    return parseExtraSnuPage(html, key);
  } catch (error) {
    return asError(error);
  }
}

@Injectable()
@Collects(EXTRA_SNU_SOURCES)
export class ExtraSnuCollector extends Collector {
  private readonly scheduled: boolean;

  constructor(
    private readonly browser: BrowserPages,
    settings: ConfigService<Settings, true>,
  ) {
    super();
    this.scheduled = settings.get('EXTRA_SNU_COLLECTION', { infer: true });
  }

  @Cron(COLLECTION_TIMES, { timeZone: 'Asia/Seoul' })
  async collect(): Promise<void> {
    if (this.scheduled) {
      await this.collectOne('extra_snu');
    }
  }

  async collectOne(source: ExtraSnuSource): Promise<boolean> {
    const now = new Date();
    const message = this.read(source, now);
    const taken = await this.handOver(source, now, '/global-events/collected', message);
    // One that stopped early is handed over all the same, and has failed.
    return taken && (await message).failureReason === null;
  }

  // Reads the programmes the main server does not store yet. What was read before a stop is handed over with why it
  // stopped, so that it is not read again and the Collection fails.
  private read(source: ExtraSnuSource, now: Date): Promise<EventsCollectedMessage> {
    return this.browser.during(async (open) => {
      const listed = await this.readList(open);
      const question: StoredEventPostsQuestion = { source, keys: listed.map(({ key }) => key) };
      const answer = await this.ask('/global-events/stored-posts', question, storedEventPostsAnswerSchema);
      const stored = new Set(answer.keys);
      const { posts, skipped, failure } = await this.readProgrammes(
        open,
        listed.filter(({ key }) => !stored.has(key)),
      );
      if (failure !== null) {
        this.logger.error(`The Collection of ${source} stopped: ${failure.message}`);
      }
      return {
        source,
        collectedAt: now.toISOString(),
        failureReason: failure?.message ?? null,
        skippedPosts: skipped,
        posts,
      };
    });
  }

  private async readList(open: OpenPage): Promise<ListedProgramme[]> {
    const listed = new Map<string, ListedProgramme>();
    for (let page = 1; page <= LISTED_PAGES; page += 1) {
      // oxlint-disable-next-line no-await-in-loop -- the site is read one page at a time
      const programmes = parseExtraSnuListPage((await this.page(open, listPageAddress(page))).html);
      if (programmes.length === 0) {
        break;
      }
      for (const programme of programmes) {
        listed.set(programme.key, programme);
      }
    }
    return [...listed.values()];
  }

  // The programmes, one after the other, as the events list's Collection reads its posts. A programme that needs a
  // sign-in or ends up short of its page is counted, and asked for again by the next Collection.
  private async readProgrammes(
    open: OpenPage,
    listed: ListedProgramme[],
  ): Promise<{ posts: CollectedPost[]; skipped: number; failure: Error | null }> {
    const posts: CollectedPost[] = [];
    let skipped = 0;
    let shortInARow = 0;
    let unreadable: CollectedPost[] = [];
    let problem: Error | null = null;
    for (const programme of listed) {
      let page: OpenedPage;
      try {
        // oxlint-disable-next-line no-await-in-loop -- no page is asked for after one that failed, which may be blocked
        page = await this.page(open, programmeAddress(programme.key));
      } catch (error) {
        return { posts, skipped, failure: asError(error) };
      }
      const signIn = needsSignIn(page.url);
      if (signIn || !isProgrammePage(page.url)) {
        this.logger.warn(`Programme ${programme.key} ended up at ${page.url}, and is skipped`);
        skipped += 1;
        shortInARow = signIn ? 0 : shortInARow + 1;
        if (shortInARow === SHORT_OF_THEIR_PAGES_IN_A_ROW) {
          return { posts, skipped, failure: new Error(heldBack(page.url)) };
        }
        continue;
      }
      shortInARow = 0;
      const read = readProgramme(page.html, programme.key);
      if (read instanceof Error) {
        this.logger.warn(`Programme ${programme.key} could not be read: ${read.message}`);
        problem = read;
        unreadable.push(unreadableProgramme(programme));
        if (unreadable.length === UNREADABLE_IN_A_ROW) {
          const failure = `${UNREADABLE_IN_A_ROW} programmes in a row could not be read: ${read.message}`;
          return { posts, skipped, failure: new Error(failure, { cause: read }) };
        }
      } else {
        posts.push(...unreadable, read);
        unreadable = [];
      }
    }
    if (posts.length === 0 && problem !== null) {
      return { posts, skipped, failure: noneRead(problem) };
    }
    return { posts: [...posts, ...unreadable], skipped, failure: null };
  }

  private async page(open: OpenPage, url: string): Promise<OpenedPage> {
    const page = await open(url);
    if (isBlocked(page.url)) {
      throw new Error(`The university's firewall blocked ${url}`);
    }
    return page;
  }
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { eventsCollectedSchema } from '../../src/global-events/dto/events-collected.dto.js';
import { isReadByRules } from '../../src/global-events/collected-posts.service.js';
import { namedPlace } from '../../src/global-events/named-place.js';
import { type PlaceDto } from '../../src/places/dto/place.dto.js';
import { type SavedPost } from './gold.ts';

// A saved page as the main server would store it: what the worker's parser reads of it, through the message's own schema,
// and which of its sessions the rules read.

export interface ReadSession {
  number: number;
  title: string;
  startsAt: Date | null;
  endsAt: Date | null;
  place: string | null;
  placeId: string | null;
  readByRules: boolean;
}

export interface ReadPost {
  post: string;
  source: SavedPost['source'];
  key: string;
  now: Date;
  // What a Judgement reads: the first session's title, as the post's first Draft holds it.
  title: string;
  description: string;
  links: string[];
  sessions: ReadSession[];
}

// The worker's parsers, passed in: main-server's CI has no worker dependencies, and only a real run reads a page.
export interface PostParsers {
  // Each answers with the worker's collected post, which the schema here checks.
  snuEvents: (html: string, key: string) => unknown;
  extraSnu: (html: string, key: string) => unknown;
}

interface EventPostFields {
  sourceUrl: string;
  title: string;
  description: string;
  links: string[];
  start: string | null;
  end: string | null;
  readFrom: string | null;
  place: string | null;
}

interface WorkerEventParser {
  parseEventPage: (html: string, postNumber: number) => EventPostFields;
}

interface WorkerExtraSnuParser {
  parseExtraSnuPage: (html: string, key: string) => unknown;
}

async function workerModule<Module>(path: string): Promise<Module> {
  // A path Vite and tsc leave alone, since the worker is another package with its own dependencies.
  const address = new URL(`../../../worker-server/src/event/${path}`, import.meta.url).href;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, no-inline-comments -- the schema below checks what its functions answer, and Vite reads this comment where it stands
  return (await import(/* @vite-ignore */ address)) as Module;
}

// The worker's parsers as they are at this commit. An events list post has one session, as the worker's collector makes it.
export async function workerParsers(): Promise<PostParsers> {
  const { parseEventPage } = await workerModule<WorkerEventParser>('event-page.parser.ts');
  const { parseExtraSnuPage } = await workerModule<WorkerExtraSnuParser>('extra-snu-page.parser.ts');
  return {
    snuEvents: (html, key) => {
      const { sourceUrl, title, description, links, start, end, readFrom, place } = parseEventPage(html, Number(key));
      return {
        key,
        address: sourceUrl,
        title,
        description,
        links,
        sessions: [{ number: 1, start, end, readFrom, place }],
      };
    },
    extraSnu: parseExtraSnuPage,
  };
}

export function readPost(saved: SavedPost, html: string, parsers: PostParsers, places: PlaceDto[]): ReadPost {
  const collected =
    saved.source === 'snu_events' ? parsers.snuEvents(html, saved.key) : parsers.extraSnu(html, saved.key);
  const [post] = eventsCollectedSchema.parse({
    source: saved.source,
    collectedAt: saved.fetchedAt.toISOString(),
    failureReason: null,
    posts: [collected],
  }).posts;
  if (post === undefined) {
    throw new Error(`${saved.post} was read as no post`);
  }
  const sessions = post.sessions.map((session) => {
    const named = namedPlace(session.place, places);
    return {
      number: session.number,
      title: session.title ?? post.title,
      startsAt: session.start?.at ?? null,
      endsAt: session.end?.at ?? null,
      place: session.place,
      placeId: named?.id ?? null,
      readByRules: isReadByRules(session, named),
    };
  });
  return {
    post: saved.post,
    source: saved.source,
    key: saved.key,
    now: saved.fetchedAt,
    title: sessions[0]?.title ?? post.title,
    description: post.description,
    links: post.links,
    sessions,
  };
}

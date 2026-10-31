/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { type GlobalEvent, type Prisma, type Source } from '../src/generated/prisma/client.js';
import { collectedPost, eventsMessage, postNumbersFrom } from './global-events.js';
import { JudgementWorld } from './judgements.js';
import { send } from './source-posts.js';

export type Post = Record<string, unknown>;

export const START = '2027-03-10T14:00:00+09:00';
export const PLACE = '뉴미디어통신공동연구소 이충웅홀(132동 103호)';

const WITH_SESSIONS = {
  sessions: { orderBy: { number: 'asc' }, include: { globalEvent: true } },
} satisfies Prisma.SourcePostInclude;

export type StoredPost = Prisma.SourcePostGetPayload<{ include: typeof WITH_SESSIONS }>;
type StoredSession = StoredPost['sessions'][number];

// Sessions of `count`, all read by the rules at START.
export function sessionsOf(count: number): object[] {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    start: START,
    end: null,
    readFrom: 'body',
    place: PLACE,
  }));
}

export function linkTo(post: Post): string {
  return `신청: ${String(post.address)}`;
}

function keyOf(post: Post): string {
  return String(post.key);
}

// A world of posts of both Sources. Each test file gives numbers of its own for its database's titles and keys.
export class SameEventWorld extends JudgementWorld {
  private readonly newPost: () => number;
  private titles = 0;
  private programmes = 0;

  constructor(firstPost: number) {
    super();
    this.newPost = postNumbersFrom(firstPost);
  }

  uniqueTitle(): string {
    this.titles += 1;
    return `같은 행사 시험 ${this.titles}번 특강`;
  }

  postNumber(): number {
    return this.newPost();
  }

  programmeKey(): string {
    this.programmes += 1;
    return `PGM${String(this.programmes).padStart(9, '0')}`;
  }

  programmeAddress(key: string): string {
    return `https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=${key}`;
  }

  // A post of the events list the rules read, at START.
  snuPost(title: string, changes: Post = {}): Post {
    return collectedPost(this.newPost(), { title, start: START, description: '본문', ...changes });
  }

  // A programme of extra.snu the rules read, at START.
  programme(title: string, changes: Post = {}): Post {
    const key = this.programmeKey();
    return collectedPost(0, {
      key,
      address: this.programmeAddress(key),
      title,
      start: START,
      description: '본문',
      ...changes,
    });
  }

  sourcePostOf(source: Source, post: Post): Promise<StoredPost> {
    return this.prisma.sourcePost.findUniqueOrThrow({
      where: { source_key: { source, key: keyOf(post) } },
      include: WITH_SESSIONS,
    });
  }

  async through(app: INestApplication<Server>, source: Source, posts: Post[]): Promise<void> {
    await send(app, eventsMessage(posts, { source }));
    const keys = posts.map((post) => keyOf(post));
    await vi.waitFor(
      async () => {
        const left = await this.prisma.sourcePost.count({
          where: { source, key: { in: keys }, stepFinishedAt: null },
        });
        expect(left).toBe(0);
      },
      { timeout: 10_000, interval: 20 },
    );
  }

  // Posts through the step on the server that judges and publishes.
  async collectedOf(source: Source, ...posts: Post[]): Promise<void> {
    await this.through(this.judging, source, posts);
  }

  async onlySession(source: Source, post: Post): Promise<StoredSession> {
    const { sessions } = await this.sourcePostOf(source, post);
    const [session, other] = sessions;
    if (session === undefined || other !== undefined) {
      throw new Error(`Post ${keyOf(post)} has not one session`);
    }
    return session;
  }

  async publishedThrough(source: Source, post: Post): Promise<GlobalEvent> {
    await this.collectedOf(source, post);
    const { globalEvent } = await this.onlySession(source, post);
    expect(globalEvent.state).toBe('published');
    return globalEvent;
  }

  stored(id: string): Promise<GlobalEvent> {
    return this.prisma.globalEvent.findUniqueOrThrow({ where: { id } });
  }
}

// What an own session the rules published looks like.
export const PUBLISHED_OWN = { attachedBy: 'own', globalEvent: { state: 'published', publicationRoute: 'rule' } };

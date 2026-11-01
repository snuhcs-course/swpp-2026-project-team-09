/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import request from 'supertest';
import { type Post, SameEventWorld, START } from './same-event.js';
import { type Step } from './scripted-model.js';

// A start far from START, for a second event in one test.
export const LATER = '2027-08-10T14:00:00+09:00';

export function chose(...entries: { answer: string; candidate?: number }[]): Step {
  return {
    text: JSON.stringify({
      sessions: entries.map(({ answer, candidate }, index) => ({
        session: index + 1,
        answer,
        candidate: candidate ?? null,
        reason: answer === 'unsure' ? '확실하지 않습니다' : '같은 행사입니다',
      })),
    }),
  };
}

export const SAME = chose({ answer: 'same', candidate: 1 });
export const DIFFERENT = chose({ answer: 'different' });
export const UNSURE = chose({ answer: 'unsure' });

export interface Queued {
  sessionId: string;
  heldFor: string;
  reason: string | null;
  draft: { id: string; version: number; missing: string[] };
  candidates: { id: string; state: string }[];
}

// A world whose server asks the AI, with what the tests of the queue and of detaching read.
export class QueueWorld extends SameEventWorld {
  override start(settings: Record<string, string> = {}): Promise<void> {
    return super.start({ SAME_EVENT_AI_CHOICE: 'on', ...settings });
  }

  async clear(): Promise<void> {
    await this.prisma.quest.deleteMany();
    await this.prisma.globalEvent.deleteMany();
    await this.prisma.sourcePost.deleteMany();
  }

  admin(method: 'get' | 'post' | 'patch', path: string): request.Test {
    return request(this.judging.getHttpServer())[method](`/admin/global-events${path}`).auth(this.administrator, {
      type: 'bearer',
    });
  }

  async queue(): Promise<Queued[]> {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- what the tests read of the documented shape
    return (await this.admin('get', '/queue').expect(200)).body as Queued[];
  }

  async queuedOf(post: Post): Promise<Queued> {
    const { id } = await this.onlySession('snu_events', post);
    const queued = (await this.queue()).find(({ sessionId }) => sessionId === id);
    if (queued === undefined) {
      throw new Error('The session is not in the queue');
    }
    return queued;
  }

  // A candidate, and a post the AI was unsure of beside it, in the queue.
  async heldPost(start = START): Promise<{ eventId: string; post: Post; queued: Queued }> {
    const event = await this.publishedThrough('extra_snu', this.programme(this.uniqueTitle(), { start }));
    const post = this.snuPost(this.uniqueTitle(), { start });
    this.scripted.script(UNSURE);
    await this.collectedOf('snu_events', post);
    return { eventId: event.id, post, queued: await this.queuedOf(post) };
  }

  // A post the AI attached to an event.
  async attachedPost(changes: Post = {}): Promise<{ eventId: string; post: Post; sessionId: string }> {
    const event = await this.publishedThrough('extra_snu', this.programme(this.uniqueTitle()));
    const post = this.snuPost(this.uniqueTitle(), changes);
    this.scripted.script(SAME);
    await this.collectedOf('snu_events', post);
    return { eventId: event.id, post, sessionId: (await this.onlySession('snu_events', post)).id };
  }

  async appLists(eventId: string): Promise<boolean> {
    const { GlobalEventsService } = await import('../src/global-events/global-events.service.js');
    return (await this.judging.get(GlobalEventsService).listPublished()).some(({ id }) => id === eventId);
  }
}

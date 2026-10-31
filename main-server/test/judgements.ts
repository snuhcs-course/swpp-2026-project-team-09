/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import {
  type GlobalEvent,
  type Judgement,
  type PrismaClient,
  type SourcePost,
} from '../src/generated/prisma/client.js';
import { type JudgementsService } from '../src/global-events/judgements.service.js';
import { type PublicationStepService } from '../src/global-events/publication-step.service.js';
import { collectedPost, eventsMessage } from './global-events.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { signInAsAdministrator } from './sign-in.js';
import { eventsOf, holdingTheStep, type PostsWorld, send, startPostsWorld } from './source-posts.js';
import { startApp } from './start-app.js';

export const TIME_LINE = '- 일시: 2026. 11. 5.(목) 14:00~16:00';
export const PLACE = '뉴미디어통신공동연구소 이충웅홀(132동 103호)';
export const PLACE_LINE = `- 장소: ${PLACE}`;

// A post the rules leave a Draft, the header's date being all they read.
export function draftPost(postNumber: number, changes: Record<string, unknown> = {}): Record<string, unknown> {
  return collectedPost(postNumber, {
    readFrom: 'header',
    start: '2026-11-05',
    place: null,
    description: `${TIME_LINE}\n${PLACE_LINE}\n문의: office@snu.ac.kr, 02-880-1234`,
    ...changes,
  });
}

export interface AnsweredSession {
  start: string | null;
  end: string | null;
  place: string | null;
  overPeriod: boolean;
  lines: { start: string[]; end: string[]; place: string[] };
}

// A session that agrees with draftPost.
export function answeredSession(changes: Partial<AnsweredSession> = {}): AnsweredSession {
  return {
    start: '2026-11-05T14:00',
    end: '2026-11-05T16:00',
    place: PLACE,
    overPeriod: false,
    lines: { start: [TIME_LINE], end: [TIME_LINE], place: [PLACE_LINE] },
    ...changes,
  };
}

export function answer(sessions: AnsweredSession[] = [answeredSession()], announcesEvent = true): Step {
  return { text: JSON.stringify({ announcesEvent, sessions }) };
}

const judgementSchema = z.object({
  outcome: z.string().nullable(),
  failure: z.string().nullable(),
  attempts: z.number(),
  announcesEvent: z.boolean().nullable(),
  modelId: z.string().nullable(),
  judgedAt: z.string().nullable(),
  sessions: z.array(
    z.object({
      start: z.string().nullable(),
      place: z.string().nullable(),
      lines: z.object({ start: z.array(z.string()), end: z.array(z.string()), place: z.array(z.string()) }),
      passed: z.boolean(),
      globalEventId: z.string().nullable(),
      checks: z.array(z.object({ name: z.string(), passed: z.boolean() })),
    }),
  ),
});

const unsettledPostsSchema = z.array(
  z.object({
    source: z.string(),
    key: z.string(),
    stepFinished: z.boolean(),
    stepFailure: z.string().nullable(),
    stepFailedAt: z.string().nullable(),
    judgementFailure: z.string().nullable(),
    judgementAttempts: z.number(),
    drafts: z.array(z.object({ id: z.string(), title: z.string() })),
  }),
);

// A server that judges with a scripted model, on a database of its own. A test file has one.
export class JudgementWorld {
  readonly scripted = new ScriptedModel();
  posts!: PostsWorld;
  prisma!: PrismaClient;
  judging!: INestApplication<Server>;
  administrator!: string;
  step!: PublicationStepService;
  judgements!: JudgementsService;

  async start(settings: Record<string, string> = {}): Promise<void> {
    this.posts = await startPostsWorld();
    this.prisma = this.posts.prisma;
    this.judging = await startApp(
      { ...this.posts.settings, AUTOMATIC_JUDGEMENT: 'on', JUDGEMENT_TIMEOUT_MS: '200', ...settings },
      [],
      undefined,
      undefined,
      this.scripted.model,
    );
    ({ accessToken: this.administrator } = await signInAsAdministrator(this.judging));
    // Imported after startApp, so that they are the classes this app registers: a later startApp makes new ones.
    this.step = this.judging.get(
      (await import('../src/global-events/publication-step.service.js')).PublicationStepService,
    );
    this.judgements = this.judging.get((await import('../src/global-events/judgements.service.js')).JudgementsService);
  }

  async stop(): Promise<void> {
    await this.judging.close();
    await this.posts.stop();
  }

  // So that a post a test left with a try to come is not taken up by the next test's Collection.
  async finishEveryPost(): Promise<void> {
    await this.prisma.sourcePost.updateMany({ where: { stepFinishedAt: null }, data: { stepFinishedAt: new Date() } });
  }

  sourcePost(postNumber: number): Promise<SourcePost> {
    return this.prisma.sourcePost.findUniqueOrThrow({
      where: { source_key: { source: 'snu_events', key: String(postNumber) } },
    });
  }

  async judgementOf(postNumber: number): Promise<Judgement | null> {
    const { id } = await this.sourcePost(postNumber);
    return this.prisma.judgement.findUnique({ where: { sourcePostId: id } });
  }

  async onlyEvent(postNumber: number): Promise<GlobalEvent> {
    const [event, other] = await eventsOf(this.prisma, postNumber);
    if (event === undefined || other !== undefined) {
      throw new Error(`Post ${postNumber} has not one event`);
    }
    return event;
  }

  eventsOf(postNumber: number): Promise<GlobalEvent[]> {
    return eventsOf(this.prisma, postNumber);
  }

  // Waits until the step finished with the post.
  async finished(postNumber: number): Promise<void> {
    await vi.waitFor(
      async () => {
        expect((await this.sourcePost(postNumber)).stepFinishedAt).not.toBeNull();
      },
      { timeout: 5000, interval: 20 },
    );
  }

  // Waits until the step finished with the post, or left it for the next try of its Judgement.
  async stepOver(postNumber: number): Promise<void> {
    await vi.waitFor(
      async () => {
        const judgement = await this.judgementOf(postNumber);
        const left = judgement?.outcome === 'failed' && judgement.claimedAt === null;
        expect(left || (await this.sourcePost(postNumber)).stepFinishedAt !== null).toBe(true);
      },
      { timeout: 5000, interval: 20 },
    );
  }

  async collected(post: Record<string, unknown>, app = this.judging): Promise<void> {
    await send(app, eventsMessage([post]));
    await this.stepOver(Number(post.key));
  }

  // The next Collection of the Source, with nothing new, takes up the posts not finished.
  async nextCollection(app = this.judging): Promise<void> {
    await send(app, eventsMessage([]));
  }

  async leftBeforeTheStep(postNumber: number): Promise<SourcePost> {
    await holdingTheStep(this.judging, () => send(this.judging, eventsMessage([draftPost(postNumber)])));
    return this.sourcePost(postNumber);
  }

  async judgementRead(globalEventId: string): Promise<z.infer<typeof judgementSchema>> {
    const response = await request(this.judging.getHttpServer())
      .get(`/admin/global-events/${globalEventId}`)
      .auth(this.administrator, { type: 'bearer' })
      .expect(200);
    return z.object({ judgement: judgementSchema }).parse(response.body).judgement;
  }

  async unsettled(): Promise<z.infer<typeof unsettledPostsSchema>> {
    const response = await request(this.judging.getHttpServer())
      .get('/admin/global-events/unsettled-posts')
      .auth(this.administrator, { type: 'bearer' })
      .expect(200);
    return unsettledPostsSchema.parse(response.body);
  }

  sentToTheModel(call = 0): string {
    return JSON.stringify(this.scripted.received()[call]?.prompt);
  }
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages, type SentMessage } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase } from './quests.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The stage of the 관정도서관 tools at the Assistant's endpoint: the app with the scripted model, on a clock that stands
// at Wednesday 2026-11-04 10:05 in Korea, the P6 world's. The library tools write nothing, so the files need no day of
// their own; each asks as Users of its own.

export const NOW = new Date('2026-11-04T10:05:00+09:00');

export const LIBRARY = { clientCapabilities: ['library'] };

const libraryCardSchema = z.strictObject({
  kind: z.literal('library'),
  library: z.strictObject({
    key: z.string(),
    action: z.enum(['book', 'cancel', 'return', 'seats', 'myBookings']),
    space: z
      .strictObject({
        id: z.string(),
        name: z.string(),
        floor: z.number(),
        placeNumber: z.literal('62-1'),
        unit: z.enum(['seat', 'room']),
        roomNo: z.number(),
        sectorNo: z.number(),
        seatNos: z.array(z.number()),
        mapImage: z.strictObject({ width: z.number(), height: z.number() }).nullable(),
        hours: z.strictObject({ open: z.string(), close: z.string() }),
        minMinutes: z.number(),
        maxMinutes: z.number(),
        stepMinutes: z.number(),
      })
      .nullable(),
    date: z.string().nullable(),
    start: z.string().nullable(),
    minutes: z.number().nullable(),
    seat: z.string().nullable(),
    useDesc: z.string().nullable(),
    useDescOptions: z.array(z.string()).nullable(),
    pledge: z.string().nullable(),
    companions: z.array(z.strictObject({ friendId: z.string(), name: z.string() })),
    questId: z.string().nullable(),
    notes: z.array(z.string()),
    until: z.string().nullable(),
    target: z
      .strictObject({ date: z.string().optional(), spaceId: z.string().optional(), start: z.string().optional() })
      .nullable(),
  }),
});

export type LibraryCardBody = z.infer<typeof libraryCardSchema>['library'];

const replySchema = z.object({ text: z.string(), cards: z.array(z.looseObject({ kind: z.string() })) });

// The library cards of a reply, each exactly in the DTO's shape.
export function libraryCards(body: unknown): LibraryCardBody[] {
  return replySchema
    .parse(body)
    .cards.filter(({ kind }) => kind === 'library')
    .map((card) => libraryCardSchema.parse(card).library);
}

export class LibraryStage {
  readonly model = new ScriptedModel();
  app!: INestApplication<Server>;
  prisma!: PrismaClient;

  async start(settings: Record<string, string | undefined>): Promise<void> {
    this.app = await startApp(settings, [], refuseKakao, refuseMatchServer, this.model.model);
    vi.spyOn(this.app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
    this.prisma = connectToDatabase();
  }

  async stop(): Promise<void> {
    await this.prisma.$disconnect();
    await this.app.close();
  }

  user(name = '관정이'): Promise<TestUser> {
    return signInUser(this.app, { name, department: '컴퓨터공학부' });
  }

  // One message of the User's, for the model to take these steps, from an app that shows library cards unless `more`
  // says otherwise.
  send(user: TestUser, steps: Step[], more: object = LIBRARY, messages: SentMessage[] = ask('…')): request.Test {
    this.model.script(...steps);
    return postAssistantMessages(this.app, user.accessToken, messages, more);
  }

  // What the one tool of the message returned, after it answered.
  async result(user: TestUser, step: Step, more: object = LIBRARY): Promise<unknown> {
    const response = await this.send(user, [step, { text: '…' }], more);
    expect(response.status).toBe(200);
    return this.model.toolResults().at(-1);
  }
}

// The step that resolves the User's words to these catalogue ids.
export function find(spaceIds: string[], words = '…'): Step {
  return { tool: 'findLibrarySpace', input: { spaceIds, words } };
}

export function resolving(name: string): Step {
  return { tool: 'resolveFriend', input: { name } };
}

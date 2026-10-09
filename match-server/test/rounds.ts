// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #48
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { type Grouping } from '../src/matching/grouping.js';
import { createDatabase } from './containers.js';
import { connectToDatabase, MainServerStub, readRequest } from './main-server.js';
import { startApp } from './start-app.js';

export interface StoredRequest {
  id: string;
  userId: string;
  globalEventId: string;
}

const requestSchema = z.object({ state: z.string(), questId: z.string().nullable() });

// The match servers of a test file of rounds, on a database of the file's own: the rounds group every waiting request,
// those of the other files included.
export class Rounds {
  settings = inject('settings');
  private prisma = connectToDatabase();
  private drop = (): Promise<void> => Promise.resolve();
  private readonly runs = new Map<INestApplication<Server>, () => Promise<void>>();
  private arrivals = 0;

  async createDatabase(): Promise<void> {
    await this.prisma.$disconnect();
    const database = await createDatabase(this.settings.DATABASE_URL);
    this.settings = { ...this.settings, DATABASE_URL: database.url };
    this.prisma = connectToDatabase(database.url);
    this.drop = database.drop;
  }

  async empty(): Promise<void> {
    await this.prisma.matchingRequest.deleteMany();
    await this.prisma.match.deleteMany();
  }

  async stopAll(): Promise<void> {
    await Promise.all([...this.runs.keys()].map((app) => this.stop(app)));
  }

  async dropDatabase(): Promise<void> {
    await this.prisma.$disconnect();
    await this.drop();
  }

  // Starts a match server with `mainServer` in the main server's place. Its rounds run by hand unless an interval is
  // given.
  async start(
    mainServer: MainServerStub,
    { grouping, intervalSeconds = 3600 }: { grouping?: Grouping; intervalSeconds?: number } = {},
  ): Promise<INestApplication<Server>> {
    const app = await startApp(
      { ...this.settings, ROUND_INTERVAL_SECONDS: String(intervalSeconds) },
      { mainServer, grouping },
    );
    // Imported before another app starts, so that it is the class this app's AppModule registers.
    const { RoundService } = await import('../src/matching/round.service.js');
    this.runs.set(app, () => app.get(RoundService).run());
    return app;
  }

  // Runs one round of the app now, as its interval would.
  async run(app: INestApplication<Server>): Promise<void> {
    await this.runs.get(app)?.();
  }

  // Stops the app, as a restart does.
  async stop(app: INestApplication<Server>): Promise<void> {
    this.runs.delete(app);
    await app.close();
  }

  // A waiting request of a new User, arriving after every request stored before it.
  waiting(globalEventId: string, size: number, hashtags: string[] = []): Promise<StoredRequest> {
    this.arrivals += 1;
    return this.prisma.matchingRequest.create({
      data: {
        userId: randomUUID(),
        globalEventId,
        size,
        hashtags,
        arrivedAt: new Date(Date.UTC(2026, 9, 4, 8, 0, this.arrivals)),
      },
      select: { id: true, userId: true, globalEventId: true },
    });
  }

  // The state of the request and its Quest, as the main server reads them.
  async stateOf(app: INestApplication<Server>, request: StoredRequest): Promise<z.infer<typeof requestSchema>> {
    const response = await readRequest(app, request.userId, request.globalEventId);
    const { state, questId } = requestSchema.parse(response.body);
    return { state, questId };
  }

  // The matches formed for the Global Event, with their Users in the order they asked.
  async matchesOf(globalEventId: string): Promise<{ id: string; state: string; userIds: string[] }[]> {
    const matches = await this.prisma.match.findMany({
      where: { globalEventId },
      include: { requests: { orderBy: { arrivedAt: 'asc' } } },
      orderBy: { formedAt: 'asc' },
    });
    return matches.map(({ id, state, requests }) => ({ id, state, userIds: requests.map(({ userId }) => userId) }));
  }
}

// Call it at the top of a test file of rounds: each test starts with no request and no match, and the match servers
// it started stop when it ends.
export function useRounds(): Rounds {
  const rounds = new Rounds();
  beforeAll(() => rounds.createDatabase());
  beforeEach(() => rounds.empty());
  afterEach(() => rounds.stopAll());
  afterAll(() => rounds.dropDatabase());
  return rounds;
}

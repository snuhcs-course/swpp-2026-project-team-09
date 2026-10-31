/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { Server } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inject } from 'vitest';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { connect, migrate, seed } from './containers.js';
import { listedAmong, publishedAmong } from './global-event-lists.js';
import { collectedPost, eventsMessage, stepOver } from './global-events.js';

import { signIn, signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';
import { askAsWorker, sendAsWorker } from './worker.js';

const THE_MIGRATION = '20261031120000_add_source_posts';
const SERVER = fileURLToPath(new URL('..', import.meta.url));

// Applies the migrations before THE_MIGRATION, through a Prisma config of their own. In node_modules, where the config
// finds `prisma/config`.
function migrateToTheOldSchema(databaseUrl: string): void {
  const folder = mkdtempSync(join(SERVER, 'node_modules', '.migration-test-'));
  try {
    const migrations = join(SERVER, 'prisma', 'migrations');
    for (const entry of readdirSync(migrations).filter((name) => name < THE_MIGRATION || name.endsWith('.toml'))) {
      cpSync(join(migrations, entry), join(folder, 'migrations', entry), { recursive: true });
    }
    const config = join(folder, 'prisma.config.ts');
    writeFileSync(
      config,
      `import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: ${JSON.stringify(join(SERVER, 'prisma', 'schema.prisma'))},
  migrations: { path: ${JSON.stringify(join(folder, 'migrations'))} },
  datasource: { url: ${JSON.stringify(databaseUrl)} },
});
`,
    );
    execFileSync('pnpm', ['prisma', 'migrate', 'deploy', '--config', config], { cwd: SERVER, stdio: 'inherit' });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

const address = (postNumber: number): string => `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${postNumber}`;

// Each event of the old schema, by what it stands for.
const OLD_EVENTS = {
  collectedPublishedByRule: { state: 'published', version: 1, post: 1001 },
  collectedEditedAfterRule: { state: 'published', version: 2, post: 1002 },
  collectedPublishedByHand: { state: 'published', version: 3, post: 1003 },
  collectedCancelled: { state: 'cancelled', version: 2, post: 1004 },
  collectedDraft: { state: 'draft', version: 1, post: 1005 },
  collectedEditedDraft: { state: 'draft', version: 2, post: 1006 },
  collectedDiscarded: { state: 'discarded', version: 2, post: 1007 },
  created: { state: 'published', version: 2, post: null },
  createdDraft: { state: 'draft', version: 1, post: null },
  createdCancelled: { state: 'cancelled', version: 3, post: null },
  createdDiscarded: { state: 'discarded', version: 2, post: null },
} as const;

type OldEvent = keyof typeof OLD_EVENTS;

const ROUTES: Record<OldEvent, string | null> = {
  collectedPublishedByRule: 'rule',
  collectedEditedAfterRule: 'administrator',
  collectedPublishedByHand: 'administrator',
  collectedCancelled: 'administrator',
  collectedDraft: null,
  collectedEditedDraft: null,
  collectedDiscarded: null,
  created: 'administrator',
  createdDraft: null,
  createdCancelled: 'administrator',
  createdDiscarded: null,
};

let shared: PrismaClient;
let prisma: PrismaClient;
let app: INestApplication<Server>;
let name: string;
const ids = new Map<string, string>();
const idOf = (event: string): string => ids.get(event) ?? '';
// The post whose address no row should lack, and which the post number still gives.
const NO_ADDRESS = 1008;

// The old columns by name: the schema's client knows them by their new names and more columns than exist yet.
async function storeTheOldEvents(): Promise<void> {
  const old = { ...OLD_EVENTS, collectedWithoutAddress: { state: 'published', version: 1, post: NO_ADDRESS } };
  for (const [event, { state, version, post }] of Object.entries(old)) {
    const id = randomUUID();
    ids.set(event, id);
    // oxlint-disable-next-line no-await-in-loop -- few rows, in order
    await prisma.$executeRawUnsafe(
      `INSERT INTO global_events
         (id, title, description, starts_at, place, latitude, longitude, state, version, post_number, source_url)
       VALUES ($1::uuid, $2, '본문', '2099-10-13T08:00:00Z', '132동', 37.45487, 126.95407,
         $3::global_event_state, $4, $5, $6)`,
      id,
      event,
      state,
      version,
      post,
      post === null || post === NO_ADDRESS ? null : address(post),
    );
  }
}

beforeAll(async () => {
  const settings = inject('settings');
  shared = connect(settings.DATABASE_URL);
  name = `migration_${randomUUID().replaceAll('-', '')}`;
  await shared.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const url = new URL(settings.DATABASE_URL);
  url.pathname = `/${name}`;
  migrateToTheOldSchema(url.toString());
  prisma = connect(url.toString());
  await storeTheOldEvents();

  migrate(url.toString());
  await seed(url.toString());
  app = await startApp({ ...settings, DATABASE_URL: url.toString() });
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  await shared.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  await shared.$disconnect();
});

describe('The migration to Source Posts', () => {
  it('moves every collected event into a Source Post of the events list with one session, discarded ones too', async () => {
    const posts = await prisma.sourcePost.findMany({ include: { sessions: true }, orderBy: { key: 'asc' } });

    const collected = Object.entries(OLD_EVENTS).flatMap(([event, { post }]) =>
      post === null ? [] : [{ event, post }],
    );
    expect(posts.map(({ source, key, address: at }) => ({ source, key, at }))).toEqual([
      ...collected.map(({ post }) => ({ source: 'snu_events', key: String(post), at: address(post) })),
      { source: 'snu_events', key: String(NO_ADDRESS), at: address(NO_ADDRESS) },
    ]);
    for (const { event, post } of collected) {
      expect(posts.find(({ key }) => key === String(post))?.sessions).toMatchObject([
        { number: 1, globalEventId: idOf(event), attachedBy: 'own', reason: null },
      ]);
    }
  });

  it('counts the step as over for what it moved', async () => {
    expect(await prisma.sourcePost.count({ where: { stepFinishedAt: null } })).toBe(0);
  });

  it('moves no event an Administrator created', async () => {
    const created = ['created', 'createdDraft', 'createdCancelled', 'createdDiscarded'].map((event) => idOf(event));

    expect(await prisma.sourcePostSession.count({ where: { globalEventId: { in: created } } })).toBe(0);
  });

  it.each(Object.entries(ROUTES))('fills the Publication Route of %s with %s', async (event, route) => {
    const stored = await prisma.globalEvent.findUniqueOrThrow({ where: { id: idOf(event) } });

    expect(stored.publicationRoute).toBe(route);
    expect(stored.needsAdministrator).toBe(false);
  });

  it.each(Object.entries(OLD_EVENTS))('keeps %s as it was', async (event, { state, version }) => {
    expect(await prisma.globalEvent.findUnique({ where: { id: idOf(event) } })).toMatchObject({
      title: event,
      state,
      version,
      latitude: 37.45487,
    });
  });
});

describe('The server over the migrated data', () => {
  it('leaves the app its events with the same address', async () => {
    const { accessToken } = await signIn(app);
    const id = idOf('collectedPublishedByRule');

    // Ordered by title at the same start.
    expect(await publishedAmong(app, accessToken, [id, idOf('created')])).toMatchObject([
      { id, sourceUrl: address(1001) },
      { id: idOf('created'), sourceUrl: null },
    ]);
  });

  it('shows an Administrator the post and the route', async () => {
    const { accessToken } = await signInAsAdministrator(app);

    expect(await listedAmong(app, accessToken, 'draft', [idOf('collectedEditedDraft')])).toMatchObject([
      { source: 'snu_events', postKey: '1006', sourceUrl: address(1006), publicationRoute: null },
    ]);
  });

  it('answers that a discarded post is stored, and the next Collection does not bring it back', async () => {
    await expect(
      askAsWorker(app, '/global-events/stored-posts', { source: 'snu_events', keys: ['1007', '1999'] }),
    ).resolves.toEqual({ keys: ['1007'] });

    await sendAsWorker(app, '/global-events/collected', eventsMessage([collectedPost(1007)]));
    await stepOver(prisma);

    expect(await prisma.sourcePostSession.count({ where: { sourcePost: { key: '1007' } } })).toBe(1);
    expect(await prisma.globalEvent.findUnique({ where: { id: idOf('collectedDiscarded') } })).toMatchObject({
      state: 'discarded',
      publicationRoute: null,
    });
  });
});

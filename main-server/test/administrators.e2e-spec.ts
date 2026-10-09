// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #13 #14
import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { StartedTestContainer } from 'testcontainers';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { mainDatabaseUrl, migrate, startPostgres } from './containers.js';
import { ADMINISTRATOR, administratorIdToken, googleSubject } from './google.js';
import { registerAdministrator, signInAsAdministrator, signInAsNewAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

const administratorSchema = z.strictObject({
  id: z.string(),
  email: z.string(),
  signedIn: z.boolean(),
});

type Administrator = z.infer<typeof administratorSchema>;

const settings = inject('settings');
let app: INestApplication<Server>;
// A second server, on a database of its own, starts with no Administrator registered. The last two groups of tests
// run on it, in order.
const firstAccount = { sub: googleSubject(), email: 'first@example.com' };
let postgres: StartedTestContainer;
let emptySettings: typeof settings;
let fresh: INestApplication<Server>;
let emptyDatabase: PrismaClient;

beforeAll(async () => {
  app = await startApp(settings);
  postgres = await startPostgres();
  const databaseUrl = mainDatabaseUrl(postgres);
  migrate(databaseUrl);
  emptySettings = {
    ...settings,
    DATABASE_URL: databaseUrl,
    INITIAL_ADMINISTRATOR_EMAILS: 'Second@Example.com, first@example.com',
  };
  fresh = await startApp(emptySettings);
  emptyDatabase = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
});

afterAll(async () => {
  await emptyDatabase.$disconnect();
  await fresh.close();
  await postgres.stop();
  await app.close();
});

function getAdministrators(accessToken: string, target = app): request.Test {
  return request(target.getHttpServer()).get('/admin/administrators').auth(accessToken, { type: 'bearer' });
}

async function list(accessToken: string, target = app): Promise<Administrator[]> {
  return z.array(administratorSchema).parse((await getAdministrators(accessToken, target)).body);
}

function remove(accessToken: string, id: string, target = app): request.Test {
  return request(target.getHttpServer()).delete(`/admin/administrators/${id}`).auth(accessToken, { type: 'bearer' });
}

function signInStatus(email: string, target = app): Promise<number> {
  return request(target.getHttpServer())
    .post('/admin/auth/google')
    .send({ idToken: administratorIdToken({ sub: googleSubject(), email }) })
    .then((response) => response.status);
}

function withoutId({ email, signedIn }: Administrator): Omit<Administrator, 'id'> {
  return { email, signedIn };
}

describe('The list of Administrators', () => {
  it('shows each one with the email address and whether they have signed in', async () => {
    const { accessToken } = await signInAsAdministrator(app);
    const email = `${randomUUID()}@example.com`;
    const registered = administratorSchema.parse((await registerAdministrator(app, accessToken, email)).body);

    const administrators = await list(accessToken);

    expect(administrators.map((administrator) => withoutId(administrator))).toContainEqual({
      email: ADMINISTRATOR.email,
      signedIn: true,
    });
    expect(administrators).toContainEqual({ id: registered.id, email, signedIn: false });
  });
});

describe('Registering an Administrator', () => {
  it('lets an address of any Google domain sign in, whatever its case', async () => {
    const { accessToken } = await signInAsAdministrator(app);
    const email = `${randomUUID()}@gmail.com`;

    const response = await registerAdministrator(app, accessToken, email.toUpperCase());

    expect(response.status).toBe(201);
    expect(withoutId(administratorSchema.parse(response.body))).toEqual({ email, signedIn: false });
    expect(await signInStatus(email)).toBe(200);
  });

  it('changes nothing when the address is registered already and answers as the first time', async () => {
    const { accessToken } = await signInAsAdministrator(app);
    const email = `${randomUUID()}@example.com`;
    const first = await registerAdministrator(app, accessToken, email);

    const again = await registerAdministrator(app, accessToken, email.toUpperCase());

    expect(again.status).toBe(first.status);
    expect(again.body).toEqual(first.body);
  });

  it('leaves an Administrator who has signed in signed in when their address is registered again', async () => {
    const { accessToken } = await signInAsAdministrator(app);
    const registered = await signInAsNewAdministrator(app);

    const again = await registerAdministrator(app, accessToken, registered.email);

    expect(again.body).toEqual({ id: registered.id, email: registered.email, signedIn: true });
    expect((await getAdministrators(registered.accessToken)).status).toBe(200);
  });

  it('refuses a body without an email address and names the field', async () => {
    const { accessToken } = await signInAsAdministrator(app);

    const response = await registerAdministrator(app, accessToken, 'not an email address');

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain('email');
  });
});

describe('Removing an Administrator', () => {
  it('refuses the removed Administrator from then on', async () => {
    const removed = await signInAsNewAdministrator(app);
    const { accessToken } = await signInAsAdministrator(app);

    const response = await remove(accessToken, removed.id);

    expect(response.status).toBe(204);
    expect((await getAdministrators(removed.accessToken)).status).toBe(401);
    expect(await signInStatus(removed.email)).toBe(403);
  });

  it('lets an Administrator remove themselves', async () => {
    const leaving = await signInAsNewAdministrator(app);

    const response = await remove(leaving.accessToken, leaving.id);

    expect(response.status).toBe(204);
    expect((await getAdministrators(leaving.accessToken)).status).toBe(401);
  });

  it('answers 404 for an Administrator who is not registered', async () => {
    const { accessToken } = await signInAsAdministrator(app);

    expect((await remove(accessToken, randomUUID())).status).toBe(404);
  });

  it('answers 400 for an id that is not a UUID', async () => {
    const { accessToken } = await signInAsAdministrator(app);

    expect((await remove(accessToken, 'not-a-uuid')).status).toBe(400);
  });
});

describe('A server started on a database without Administrators', () => {
  it('registers every initial Administrator and creates no User for them', async () => {
    const { accessToken } = await signInAsAdministrator(fresh, firstAccount);

    const administrators = await list(accessToken, fresh);

    expect(administrators.map((administrator) => withoutId(administrator))).toEqual([
      { email: 'first@example.com', signedIn: true },
      { email: 'second@example.com', signedIn: false },
    ]);
    expect(await emptyDatabase.user.count()).toBe(0);
  });

  it('registers nobody when it starts again with another list', async () => {
    const restarted = await startApp({ ...emptySettings, INITIAL_ADMINISTRATOR_EMAILS: 'third@example.com' });
    try {
      expect(await signInStatus('third@example.com', restarted)).toBe(403);
      expect(await list((await signInAsAdministrator(restarted, firstAccount)).accessToken, restarted)).toHaveLength(2);
    } finally {
      await restarted.close();
    }
  });
});

// Holds a lock on an Administrator's row, as a request that is still running would, until the returned function is
// called.
async function lockAdministrator(id: string): Promise<() => Promise<void>> {
  let release: (() => void) | undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let locked: (() => void) | undefined;
  const isLocked = new Promise<void>((resolve) => {
    locked = resolve;
  });
  const transaction = emptyDatabase.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM administrators WHERE id = ${id}::uuid FOR UPDATE`;
      locked?.();
      await released;
    },
    { timeout: 10_000 },
  );
  await Promise.race([isLocked, transaction]);
  return async () => {
    release?.();
    await transaction;
  };
}

// Waits until `count` requests wait for a lock in the database or have been answered.
async function waitForRequests(count: number, answered: () => number): Promise<void> {
  const [row] = await emptyDatabase.$queryRaw<{ waiting: number }[]>`
    SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0`;
  if ((row?.waiting ?? 0) + answered() >= count) {
    return;
  }
  await new Promise((resolve) => {
    setTimeout(resolve, 10);
  });
  await waitForRequests(count, answered);
}

describe('The last Administrator', () => {
  it('cannot be removed', async () => {
    const { accessToken } = await signInAsAdministrator(fresh, firstAccount);
    const [self, other] = await list(accessToken, fresh);
    expect((await remove(accessToken, other?.id ?? '', fresh)).status).toBe(204);

    const response = await remove(accessToken, self?.id ?? '', fresh);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ message: 'The last Administrator cannot be removed.' });
    expect(await list(accessToken, fresh)).toHaveLength(1);
  });

  it('stays when two Administrators remove each other at the same moment', async () => {
    const { accessToken: firstToken } = await signInAsAdministrator(fresh, firstAccount);
    const otherAccount = { sub: googleSubject(), email: 'other@example.com' };
    const other = administratorSchema.parse((await registerAdministrator(fresh, firstToken, otherAccount.email)).body);
    const { accessToken: otherToken } = await signInAsAdministrator(fresh, otherAccount);
    const first = (await list(firstToken, fresh)).find(({ email }) => email === firstAccount.email);
    let answered = 0;
    const removeAs = (accessToken: string, id: string): Promise<number> =>
      remove(accessToken, id, fresh).then(({ status }) => {
        answered += 1;
        return status;
      });

    // The other's removal of the first waits for the test's lock; the first's removal of the other starts meanwhile.
    const release = await lockAdministrator(first?.id ?? '');
    const removingFirst = removeAs(otherToken, first?.id ?? '');
    await waitForRequests(1, () => answered);
    const removingOther = removeAs(firstToken, other.id);
    await waitForRequests(2, () => answered);
    await release();

    expect([await removingFirst, await removingOther].toSorted((a, b) => a - b)).toEqual([204, 409]);
    expect(await emptyDatabase.administrator.count()).toBe(1);
  });
});

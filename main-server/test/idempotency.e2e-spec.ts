import { Body, Controller, INestApplication, InternalServerErrorException, Post } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../src/common/current-user.decorator.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';

const DAY = 24 * 60 * 60 * 1000;

// No feature marks a handler with @Idempotent() yet (P06, P08 and P12 will), so these tests mark handlers of their
// own. A handler counts its runs and answers with the count, so that a test can tell a run from a replay. A test can
// hold the runs until it lets them finish, or make the next run fail with a server error.

const createdSchema = z.strictObject({ run: z.number(), userId: z.string(), body: z.unknown() });

type Created = z.infer<typeof createdSchema>;

let runs = 0;
let held: Promise<void> = Promise.resolve();
let failNextRun = false;

async function create(body: unknown, user: SignedInUser): Promise<Created> {
  runs += 1;
  const run = runs;
  await held;
  if (failNextRun) {
    failNextRun = false;
    throw new InternalServerErrorException();
  }
  return { run, userId: user.id, body };
}

// Holds every run until the returned function is called.
function holdRuns(): () => void {
  let finish: (() => void) | undefined;
  held = new Promise((resolve) => {
    finish = resolve;
  });
  return () => finish?.();
}

@Controller('repeatable')
class RepeatableController {
  @Post('things/:id')
  @Idempotent()
  createThing(@Body() body: unknown, @CurrentUser() user: SignedInUser): Promise<Created> {
    return create(body, user);
  }

  @Post('required-things/:id')
  @Idempotent({ required: true })
  createRequiredThing(@Body() body: unknown, @CurrentUser() user: SignedInUser): Promise<Created> {
    return create(body, user);
  }
}

const settings = inject('settings');
let app: INestApplication<Server>;
// The tests read the stored records with their own connection.
let redis: Redis;

beforeAll(async () => {
  app = await startApp(settings, [RepeatableController]);
  redis = new Redis({ host: settings.REDIS_HOST, port: Number(settings.REDIS_PORT) });
});

afterAll(async () => {
  await redis.quit();
  await app.close();
});

beforeEach(() => {
  runs = 0;
  held = Promise.resolve();
  failNextRun = false;
});

function post(path: string, accessToken: string, key?: string, title = 'First'): request.Test {
  const sent = request(app.getHttpServer()).post(path).auth(accessToken, { type: 'bearer' }).send({ title });
  return key === undefined ? sent : sent.set('Idempotency-Key', key);
}

describe('A request sent twice with the same Idempotency-Key', () => {
  it('runs the handler once and answers the repeat with the first result', async () => {
    const { accessToken } = await signIn(app);
    const key = randomUUID();

    const first = await post('/repeatable/things/1', accessToken, key);
    const repeat = await post('/repeatable/things/1', accessToken, key);

    expect(first.status).toBe(201);
    expect(first.headers['idempotent-replayed']).toBeUndefined();
    expect(repeat.status).toBe(201);
    expect(repeat.headers['idempotent-replayed']).toBe('true');
    expect(repeat.body).toEqual(first.body);
    expect(runs).toBe(1);
  });

  it('runs the handler for each User that sends the key', async () => {
    const oneUser = await signIn(app);
    const otherUser = await signIn(app);
    const key = randomUUID();

    const fromOne = await post('/repeatable/things/1', oneUser.accessToken, key);
    const fromOther = await post('/repeatable/things/1', otherUser.accessToken, key);

    expect(fromOther.status).toBe(201);
    expect(fromOther.headers['idempotent-replayed']).toBeUndefined();
    expect(createdSchema.parse(fromOther.body).userId).not.toBe(createdSchema.parse(fromOne.body).userId);
    expect(runs).toBe(2);
  });

  it('keeps the result in Redis for 24 hours', async () => {
    const { accessToken } = await signIn(app);
    const key = randomUUID();

    const response = await post('/repeatable/things/1', accessToken, key);

    const { userId } = createdSchema.parse(response.body);
    const lifetime = await redis.pttl(`idem:${userId}:${key}`);
    expect(lifetime).toBeGreaterThan(DAY - 60_000);
    expect(lifetime).toBeLessThanOrEqual(DAY);
  });
});

describe('Two requests sent at the same moment with the same Idempotency-Key', () => {
  it('run the handler once and answer the other one 409 with Retry-After', async () => {
    const { accessToken } = await signIn(app);
    const key = randomUUID();
    const finish = holdRuns();

    // The run of the request that took the key is held, so the other one answers first.
    const sent = [post('/repeatable/things/1', accessToken, key), post('/repeatable/things/1', accessToken, key)];
    const repeat = await Promise.race(sent);
    finish();
    const [one, other] = await Promise.all(sent);

    expect(repeat.status).toBe(409);
    expect(repeat.headers['retry-after']).toBe('1');
    expect(repeat.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_IN_USE' });
    expect([one.status, other.status]).toContain(201);
    expect(runs).toBe(1);
  });
});

describe('The same Idempotency-Key on a different request', () => {
  it('answers 422 when the body differs', async () => {
    const { accessToken } = await signIn(app);
    const key = randomUUID();

    await post('/repeatable/things/1', accessToken, key, 'First');
    const response = await post('/repeatable/things/1', accessToken, key, 'Second');

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(runs).toBe(1);
  });

  it('answers 422 when the address differs', async () => {
    const { accessToken } = await signIn(app);
    const key = randomUUID();

    await post('/repeatable/things/1', accessToken, key);
    const response = await post('/repeatable/things/2', accessToken, key);

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(runs).toBe(1);
  });
});

describe('A request that ended in a server error', () => {
  it('is not stored, so the same key runs the handler again', async () => {
    const { accessToken } = await signIn(app);
    const key = randomUUID();
    failNextRun = true;

    const failed = await post('/repeatable/things/1', accessToken, key);
    const retried = await post('/repeatable/things/1', accessToken, key);

    expect(failed.status).toBe(500);
    expect(retried.status).toBe(201);
    expect(retried.headers['idempotent-replayed']).toBeUndefined();
    expect(runs).toBe(2);
  });
});

describe('Requiring an Idempotency-Key', () => {
  it('refuses a request without a key to a handler that requires one', async () => {
    const { accessToken } = await signIn(app);

    const response = await post('/repeatable/required-things/1', accessToken);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' });
    expect(runs).toBe(0);
  });

  it('runs every request without a key to a handler that does not require one', async () => {
    const { accessToken } = await signIn(app);

    const first = await post('/repeatable/things/1', accessToken);
    const second = await post('/repeatable/things/1', accessToken);

    expect([first.status, second.status]).toEqual([201, 201]);
    expect(runs).toBe(2);
  });
});

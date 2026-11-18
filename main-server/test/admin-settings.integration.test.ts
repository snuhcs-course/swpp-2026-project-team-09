/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { connect, seededDatabase } from './containers.js';
import { signIn, signInAsAdministrator, signInAsNewAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

// The settings are global, so this file uses a database of its own: a save here reaches no other test file.
const ANTHROPIC_KEY = 'sk-ant-test-claude-key';
const LLM_KEYS = JSON.stringify({ claude: ANTHROPIC_KEY });

let prisma: PrismaClient;
let url: string;
let drop: () => Promise<void>;
let app: INestApplication<Server>;
let token: string;

beforeAll(async () => {
  // Seeded, because the server does not start without the Places.
  ({ url, drop } = await seededDatabase(inject('settings')));
  prisma = connect(url);
  app = await startApp({ ...inject('settings'), DATABASE_URL: url, LLM_KEYS });
  // The server's own minute check runs at the real clock's second 0, which can fall between a save and the listing
  // that expects the value still in effect. No test here runs a check.
  await app.get(SchedulerRegistry).getCronJob('global-settings-check').stop();
  ({ accessToken: token } = await signInAsAdministrator(app));
  // Starting the whole server can take longer than a hook's default.
}, 60_000);

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  await drop();
});

beforeEach(async () => {
  await prisma.settingChange.deleteMany();
  await prisma.setting.deleteMany();
});

const valueSchema = z.union([z.string(), z.number(), z.boolean()]);

const settingsSchema = z.array(
  z.strictObject({
    name: z.string(),
    type: z.enum(['STRING', 'INTEGER', 'BOOLEAN']),
    description: z.string(),
    default: valueSchema,
    value: valueSchema,
    allowed: z.array(z.strictObject({ value: valueSchema, label: z.string() })).nullable(),
    lastChange: z.strictObject({ newValue: z.string(), appliesAt: z.iso.datetime() }).nullable(),
  }),
);

const historySchema = z.array(
  z.strictObject({
    name: z.string(),
    oldValue: z.string(),
    newValue: z.string(),
    administratorEmail: z.string(),
    changedAt: z.iso.datetime(),
    appliesAt: z.iso.datetime(),
  }),
);

function save(name: string, value: unknown, accessToken = token): request.Test {
  return request(app.getHttpServer())
    .put(`/admin/settings/${encodeURIComponent(name)}`)
    .auth(accessToken, { type: 'bearer' })
    .send({ value });
}

async function listed(): Promise<{ body: z.infer<typeof settingsSchema>; text: string }> {
  const response = await request(app.getHttpServer()).get('/admin/settings').auth(token, { type: 'bearer' });
  expect(response.status).toBe(200);
  return { body: settingsSchema.parse(response.body), text: response.text };
}

async function history(): Promise<z.infer<typeof historySchema>> {
  const response = await request(app.getHttpServer()).get('/admin/settings/history').auth(token, { type: 'bearer' });
  expect(response.status).toBe(200);
  return historySchema.parse(response.body);
}

describe("an Administrator's list of the global settings", () => {
  it('lists llm.key with its type, the names of the keys with their providers and its value, and no key', async () => {
    const { body, text } = await listed();

    expect(body).toEqual([
      expect.objectContaining({
        name: 'llm.key',
        type: 'STRING',
        default: 'default',
        value: 'default',
        allowed: [
          { value: 'default', label: 'default (OpenRouter)' },
          { value: 'claude', label: 'claude (Anthropic)' },
        ],
        lastChange: null,
      }),
    ]);
    expect(text).not.toContain('sk-');
  });

  it("refuses a User's token", async () => {
    const { accessToken } = await signIn(app);

    expect(
      (await request(app.getHttpServer()).get('/admin/settings').auth(accessToken, { type: 'bearer' })).status,
    ).toBe(401);
    expect((await save('llm.key', 'claude', accessToken)).status).toBe(401);
    expect(await prisma.settingChange.count()).toBe(0);
  });
});

describe('saving a global setting from the admin site', () => {
  it('saves it to apply at the next minute, keeps the value in effect until then, and lists the change', async () => {
    const response = await save('llm.key', 'claude');

    expect(response.status).toBe(200);
    const { appliesAt } = z.strictObject({ appliesAt: z.iso.datetime() }).parse(response.body);
    expect(new Date(appliesAt).getUTCSeconds()).toBe(0);
    expect(new Date(appliesAt).getTime() - Date.now()).toBeLessThanOrEqual(60_000);
    const [llmKey] = (await listed()).body;
    expect(llmKey.value).toBe('default');
    expect(llmKey.lastChange?.newValue).toBe('claude');
    expect(new Date(llmKey.lastChange?.appliesAt ?? '').getUTCSeconds()).toBe(0);
  });

  it('lets any Administrator save, and the history says who changed what, newest first', async () => {
    const other = await signInAsNewAdministrator(app);

    expect((await save('llm.key', 'claude')).status).toBe(200);
    expect((await save('llm.key', 'default', other.accessToken)).status).toBe(200);

    expect(
      (await history()).map(({ name, oldValue, newValue, administratorEmail }) => ({
        name,
        oldValue,
        newValue,
        administratorEmail,
      })),
    ).toEqual([
      { name: 'llm.key', oldValue: 'claude', newValue: 'default', administratorEmail: other.email },
      { name: 'llm.key', oldValue: 'default', newValue: 'claude', administratorEmail: 'admin@example.com' },
    ]);
    expect((await listed()).body[0].lastChange?.newValue).toBe('default');
  });
});

describe('a refused save', () => {
  it.each([
    ['an unregistered name', 'no.such', 'claude', 'no.such is not a setting.'],
    ['a value not allowed', 'llm.key', 'gpt', 'llm.key: gpt is not one of default, claude.'],
  ])('refuses %s with 400 and the reason, and writes nothing', async (_case, name, value, reason) => {
    const response = await save(name, value);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: reason });
    expect(await history()).toEqual([]);
  });

  it('refuses a value that is not text with 400, and writes nothing', async () => {
    const response = await save('llm.key', 5);

    expect(response.status).toBe(400);
    expect(await history()).toEqual([]);
  });
});

describe('a save of a key the server has no key for', () => {
  let keyless: INestApplication<Server>;

  beforeAll(async () => {
    // Without OPENROUTER_API_KEY, `default` stays allowed, being the default, but the server has no key by that name.
    keyless = await startApp({ ...inject('settings'), DATABASE_URL: url, LLM_KEYS, OPENROUTER_API_KEY: '' });
  }, 60_000);

  afterAll(async () => {
    await keyless.close();
  });

  it('is refused with 400 and the reason', async () => {
    const { accessToken } = await signInAsAdministrator(keyless);

    const response = await request(keyless.getHttpServer())
      .put('/admin/settings/llm.key')
      .auth(accessToken, { type: 'bearer' })
      .send({ value: 'default' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'The server has no key named default.' });
    expect(await prisma.settingChange.count()).toBe(0);
  });
});

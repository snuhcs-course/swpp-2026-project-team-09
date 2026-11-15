/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { inject } from 'vitest';
import { PrismaService } from '../src/common/prisma.service.js';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { GlobalSettings } from '../src/global-settings/global-settings.service.js';
import { SETTING_REGISTRY } from '../src/global-settings/registered-settings.js';
import { defineSetting, type SettingDefinition } from '../src/global-settings/registry.js';
import { SettingRefused } from '../src/global-settings/setting-refused.js';
import { connect, createDatabase } from './containers.js';
import { startApp } from './start-app.js';

// A test-only setting whose allowed values and default come from a function evaluated at start, as a setting whose
// values another module knows only then registers them.
const KEY_NAMES = ['alpha', 'beta', 'gamma'];
const TEST_KEY = defineSetting({
  name: 'test.key',
  type: 'STRING',
  description: 'Which named key a test uses.',
  default: () => KEY_NAMES[0],
  allowed: () => KEY_NAMES,
  // As a setting refuses a value it allows but the server cannot use now.
  check: (value) => (value === 'gamma' ? 'gamma has no key.' : null),
});
const TEST_LIMIT = defineSetting({ name: 'test.limit', type: 'INTEGER', description: 'A limit.', default: 3 });
const REGISTRY: SettingDefinition[] = [TEST_KEY, TEST_LIMIT];

// The settings are global, so these tests use a database of their own: a save here reaches no other test file.
let prisma: PrismaClient;
let url: string;
let drop: () => Promise<void>;
let administratorId: string;
const pods: { close: () => Promise<void> }[] = [];

beforeAll(async () => {
  ({ prisma, url, drop } = await createDatabase(inject('settings').DATABASE_URL));
  ({ id: administratorId } = await prisma.administrator.create({ data: { email: 'settings@example.com' } }));
});

afterAll(async () => {
  await drop();
});

beforeEach(async () => {
  await prisma.settingChange.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.settingsRevision.update({ where: { id: 1 }, data: { revision: 0 } });
});

afterEach(async () => {
  await Promise.all(pods.splice(0).map((pod) => pod.close()));
});

// One main-server pod's GlobalSettings, on a client of its own, loaded as at start.
async function startPod(
  registry: SettingDefinition[] = REGISTRY,
  databaseUrl = url,
): Promise<{
  settings: GlobalSettings;
  client: PrismaClient;
}> {
  const client = connect(databaseUrl);
  const moduleRef = await Test.createTestingModule({
    providers: [
      GlobalSettings,
      { provide: PrismaService, useValue: client },
      { provide: SETTING_REGISTRY, useValue: registry },
    ],
  }).compile();
  pods.push({ close: () => client.$disconnect() });
  await moduleRef.init();
  return { settings: moduleRef.get(GlobalSettings), client };
}

async function revision(): Promise<number> {
  return (await prisma.settingsRevision.findUniqueOrThrow({ where: { id: 1 } })).revision;
}

describe('saving a global setting', () => {
  it('saves the setting, its history row and the revision together', async () => {
    const { settings } = await startPod();

    await settings.save('test.key', 'beta', administratorId);

    expect(await prisma.setting.findUnique({ where: { name: 'test.key' } })).toMatchObject({
      valueType: 'STRING',
      value: 'beta',
    });
    expect(await prisma.settingChange.findMany()).toEqual([
      expect.objectContaining({
        name: 'test.key',
        oldValue: 'alpha',
        newValue: 'beta',
        administratorId,
        administratorEmail: 'settings@example.com',
        revision: 1,
      }),
    ]);
    expect(await revision()).toBe(1);
  });

  it('writes nothing when the save fails inside its transaction', async () => {
    const { settings } = await startPod();

    // The revision is raised before the Administrator is read, so only one transaction undoes it.
    await expect(settings.save('test.key', 'beta', '00000000-0000-4000-8000-000000000000')).rejects.toThrow();

    expect(await revision()).toBe(0);
    expect(await prisma.setting.count()).toBe(0);
    expect(await prisma.settingChange.count()).toBe(0);
  });
});

describe('saving global settings at the same moment, or refused', () => {
  it('orders saves made at the same moment, each with its own revision and old value', async () => {
    const { settings } = await startPod();

    await Promise.all(['1', '2', '3', '4'].map((value) => settings.save('test.limit', value, administratorId)));

    const changes = await prisma.settingChange.findMany({ orderBy: { revision: 'asc' } });
    expect(changes.map((change) => change.revision)).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < changes.length; i++) {
      expect(changes[i].oldValue).toBe(changes[i - 1].newValue);
    }
    expect(await revision()).toBe(4);
  });

  it("refuses an unregistered name, a wrong value and what the setting's check refuses, and writes nothing", async () => {
    const { settings } = await startPod();

    await expect(settings.save('test.unknown', 'x', administratorId)).rejects.toThrow(
      new SettingRefused('test.unknown is not a setting.'),
    );
    await expect(settings.save('test.key', 'delta', administratorId)).rejects.toBeInstanceOf(SettingRefused);
    await expect(settings.save('test.limit', 'many', administratorId)).rejects.toBeInstanceOf(SettingRefused);
    await expect(settings.save('test.key', 'gamma', administratorId)).rejects.toThrow(
      new SettingRefused('gamma has no key.'),
    );

    expect(await revision()).toBe(0);
    expect(await prisma.settingChange.count()).toBe(0);
  });
});

describe('loading the global settings at start', () => {
  it('loads every row at start, and reads a setting with no row, or a value it no longer takes, as its default', async () => {
    await prisma.setting.createMany({
      data: [
        { name: 'test.key', valueType: 'STRING', value: 'gamma' },
        { name: 'test.limit', valueType: 'INTEGER', value: 'many' },
        { name: 'test.removed', valueType: 'STRING', value: 'x' },
      ],
    });

    const { settings } = await startPod();

    expect(settings.get(TEST_KEY)).toBe('gamma');
    expect(settings.get(TEST_LIMIT)).toBe(3);
    expect(settings.list().map(({ name, value, allowed }) => ({ name, value, allowed }))).toEqual([
      { name: 'test.key', value: 'gamma', allowed: KEY_NAMES },
      { name: 'test.limit', value: 3, allowed: null },
    ]);
  });

  it('does not start when it cannot load the settings', async () => {
    const refused = new URL(url);
    refused.password = 'wrong';
    await expect(startPod(REGISTRY, refused.toString())).rejects.toThrow();
  });
});

describe("the global settings' minute check", () => {
  it('is read by no pod, the saving one included, before the minute check, and by both after it', async () => {
    const a = await startPod();
    const b = await startPod();

    const { appliesAt } = await a.settings.save('test.key', 'beta', administratorId);

    expect(appliesAt.getUTCSeconds()).toBe(0);
    expect(appliesAt.getTime()).toBeGreaterThan(Date.now());
    expect(a.settings.get(TEST_KEY)).toBe('alpha');
    expect(b.settings.get(TEST_KEY)).toBe('alpha');

    await Promise.all([a.settings.check(), b.settings.check()]);

    expect(a.settings.get(TEST_KEY)).toBe('beta');
    expect(b.settings.get(TEST_KEY)).toBe('beta');
  });
});

describe('reloading the global settings', () => {
  it('reloads the rows at the check only when the revision changed', async () => {
    const { settings, client } = await startPod();
    const findMany = vi.spyOn(client.setting, 'findMany');

    await settings.check();
    expect(findMany).not.toHaveBeenCalled();

    await settings.save('test.limit', '7', administratorId);
    await settings.check();
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(settings.get(TEST_LIMIT)).toBe(7);
  });

  it('keeps the last copy when a check fails', async () => {
    const { settings, client } = await startPod();
    await settings.save('test.limit', '7', administratorId);
    vi.spyOn(client.settingsRevision, 'findUniqueOrThrow').mockRejectedValueOnce(new Error('connection lost'));

    await settings.check();
    expect(settings.get(TEST_LIMIT)).toBe(3);

    await settings.check();
    expect(settings.get(TEST_LIMIT)).toBe(7);
  });
});

describe("the global settings' history", () => {
  it('gives the history newest first, with when each change applies', async () => {
    const { settings } = await startPod();
    await settings.save('test.limit', '5', administratorId);
    await settings.save('test.key', 'beta', administratorId);

    const history = await settings.history();

    expect(history.map(({ name, oldValue, newValue }) => ({ name, oldValue, newValue }))).toEqual([
      { name: 'test.key', oldValue: 'alpha', newValue: 'beta' },
      { name: 'test.limit', oldValue: '3', newValue: '5' },
    ]);
    expect(history[0].appliesAt.getUTCSeconds()).toBe(0);
    expect(history[0].appliesAt.getTime() - history[0].changedAt.getTime()).toBeLessThanOrEqual(60_000);
  });

  it('runs the check at second 0 of every minute in the server', async () => {
    const app = await startApp(inject('settings'));
    try {
      const job = app.get(SchedulerRegistry).getCronJob('global-settings-check');
      expect(job.cronTime.source).toBe('0 * * * * *');
    } finally {
      await app.close();
    }
  });
});

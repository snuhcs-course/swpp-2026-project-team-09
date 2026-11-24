/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-20  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { type LanguageModelMiddleware, wrapLanguageModel } from 'ai';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type Model } from '../src/assistant/adapter.js';
import { type ModelFactory } from '../src/assistant/model-port.js';
import { type GlobalSettings } from '../src/global-settings/global-settings.service.js';
import { ask, captureLogs, captureLogsApart, postAssistantMessages } from './assistant.js';
import { connect, seededDatabase } from './containers.js';
import { ScriptedModel } from './scripted-model.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The chat's key (spec A02, ticket 02): each answer reads llm.key once, at its start, and keeps that key's model for
// every call; a saved name the server has no key for reads as default; a save of such a name is refused; each call
// logs the key's name and provider. The settings are global, so the file has a database of its own.

const ANTHROPIC_KEY = 'sk-ant-test-claude-key';
const KEYS = { LLM_KEYS: JSON.stringify({ claude: ANTHROPIC_KEY }) };
const UNAVAILABLE = { statusCode: 503, error: 'Service Unavailable', message: 'The Assistant cannot answer now' };

const scripted = { default: new ScriptedModel(), claude: new ScriptedModel() };
// Runs once, before the first call to claude's model returns, when a test sets it.
let duringClaude: (() => Promise<void>) | null = null;

function beforeFirstAnswer(model: Model): Model {
  const middleware: LanguageModelMiddleware = {
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      const during = duringClaude;
      duringClaude = null;
      await during?.();
      return result;
    },
  };
  return wrapLanguageModel({ model, middleware });
}

const modelFactory: ModelFactory = ({ name }) =>
  name === 'claude' ? beforeFirstAnswer(scripted.claude.model) : scripted.default.model;

let database: Awaited<ReturnType<typeof seededDatabase>>;
let administratorId: string;
const apps: INestApplication<Server>[] = [];

async function pod(settings: Record<string, string> = KEYS): Promise<{
  app: INestApplication<Server>;
  settings: GlobalSettings;
  token: string;
}> {
  const app = await startApp(
    { ...database.settings, ...settings },
    [],
    refuseKakao,
    undefined,
    [],
    undefined,
    undefined,
    { modelFactory },
  );
  apps.push(app);
  // The tests run the minute check themselves. The server's own, at the real clock's second 0, would make one of
  // theirs that starts while it runs return before the copy is loaded.
  await app.get(SchedulerRegistry).getCronJob('global-settings-check').stop();
  const { GlobalSettings } = await import('../src/global-settings/global-settings.service.js');
  const { accessToken } = await signIn(app);
  return { app, settings: app.get(GlobalSettings), token: accessToken };
}

beforeAll(async () => {
  database = await seededDatabase(inject('settings'));
  const prisma = connect(database.url);
  try {
    ({ id: administratorId } = await prisma.administrator.create({ data: { email: 'llm-key@example.com' } }));
  } finally {
    await prisma.$disconnect();
  }
});

afterEach(async () => {
  vi.restoreAllMocks();
  duringClaude = null;
  await Promise.all(apps.splice(0).map((app) => app.close()));
  const prisma = connect(database.url);
  try {
    await prisma.settingChange.deleteMany();
    await prisma.setting.deleteMany();
  } finally {
    await prisma.$disconnect();
  }
});

afterAll(async () => {
  await database.drop();
});

// For the first case, whose pod loads the server's modules in this worker, on a machine that may be busy.
const SLOW = { timeout: 20_000 };

describe('An answer of the chat', () => {
  it('with nothing saved, is made with the default key', SLOW, async () => {
    const { app, token } = await pod();
    scripted.default.script({ text: '네' });

    const response = await postAssistantMessages(app, token, ask('안녕'));

    expect(response.body).toMatchObject({ text: '네' });
    expect(scripted.default.received()).toHaveLength(1);
  });

  it('keeps the key it read at its start for every call, when the copy changes to another key during it', async () => {
    const { app, settings, token } = await pod();
    await settings.save('llm.key', 'claude', administratorId);
    await settings.check();
    scripted.claude.script({ tool: 'getMenus', input: { date: '2027-02-01' } }, { text: '메뉴예요' });
    scripted.default.script({ text: '다른 키' });
    duringClaude = async (): Promise<void> => {
      await settings.save('llm.key', 'default', administratorId);
      await settings.check();
    };

    const response = await postAssistantMessages(app, token, ask('메뉴 알려줘'));

    expect(response.body).toMatchObject({ text: '메뉴예요' });
    expect(scripted.claude.received()).toHaveLength(2);
    expect(scripted.default.received()).toHaveLength(0);
    // The next answer reads the copy anew.
    expect((await postAssistantMessages(app, token, ask('안녕'))).body).toMatchObject({ text: '다른 키' });
  });

  it("logs one line for each call with the key's name and provider, never the key, and what was sent only on the request line", async () => {
    const { app, settings, token } = await pod();
    await settings.save('llm.key', 'claude', administratorId);
    await settings.check();
    scripted.claude.script({ text: '네' });
    const { requestLines, otherLines } = captureLogsApart();

    await postAssistantMessages(app, token, ask('비밀 메시지'));

    expect(otherLines()).toContain('Model call with key claude on Anthropic: answered, finish stop');
    expect(`${requestLines()}${otherLines()}`).not.toContain(ANTHROPIC_KEY);
    expect(otherLines()).not.toContain('비밀 메시지');
    expect(requestLines()).toContain('비밀 메시지');
  });
});

describe('A saved key the server no longer has', () => {
  it('reads as default, and the server logs it', async () => {
    const first = await pod();
    await first.settings.save('llm.key', 'claude', administratorId);
    const logs = captureLogs();

    // A later Release removed the key.
    const { app, settings, token } = await pod({ LLM_KEYS: '{}' });
    scripted.default.script({ text: '기본 키' });

    expect(settings.list().find(({ name }) => name === 'llm.key')?.value).toBe('default');
    expect(logs()).toContain('The setting llm.key holds a value it does not take; it reads as its default.');
    expect((await postAssistantMessages(app, token, ask('안녕'))).body).toMatchObject({ text: '기본 키' });
  });

  it('cannot be saved', async () => {
    const { settings } = await pod({ LLM_KEYS: '{}' });

    await expect(settings.save('llm.key', 'claude', administratorId)).rejects.toMatchObject({
      reason: 'llm.key: claude is not one of default.',
    });
  });
});

describe('Without OPENROUTER_API_KEY', () => {
  it('default cannot be saved, and with it in effect the chat answers 503 calling no model', async () => {
    const { app, settings, token } = await pod({ ...KEYS, OPENROUTER_API_KEY: '' });
    scripted.default.script({ text: '네' });

    await expect(settings.save('llm.key', 'default', administratorId)).rejects.toMatchObject({
      reason: 'The server has no key named default.',
    });
    const response = await postAssistantMessages(app, token, ask('안녕'));

    expect(response.status).toBe(503);
    expect(response.body).toEqual(UNAVAILABLE);
    expect(scripted.default.received()).toHaveLength(0);
  });
});

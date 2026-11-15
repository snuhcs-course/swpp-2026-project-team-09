/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { APICallError, generateText } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { type Model } from '../src/assistant/adapter.js';
import { MODEL_FACTORY_PROVIDER, type ModelFactory, ModelPort } from '../src/assistant/model-port.js';
import { aiKeysOf } from '../src/common/llm-keys.js';
import { type Settings } from '../src/common/settings.js';
import { type GlobalSettings } from '../src/global-settings/global-settings.service.js';

// The models of the AI's keys (spec A02): the keys offered by their prefix, a model built at start for each, the one
// llm.key names when it is asked, the refusal of a name the server has no key for, and the log line of each call. No
// request leaves the test.

type Result = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;

const ANSWER: Result = {
  content: [{ type: 'text', text: '네' }],
  finishReason: { unified: 'stop', raw: undefined },
  usage: {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: undefined },
  },
  warnings: [],
};

const ask = (model: Model): ReturnType<typeof generateText> => generateText({ model, prompt: '안녕', maxRetries: 0 });

const ANTHROPIC_KEY = 'sk-ant-api03-secret-value';
const OPENROUTER_KEY = 'sk-or-v1-secret-value';

// The settings as the server's ConfigService gives them.
function configOf(values: Partial<Settings>): ConfigService<Settings, true> {
  const all: Record<string, unknown> = { OPENROUTER_API_KEY: '', LLM_KEYS: {}, MODEL_CACHE: 'breakpoints', ...values };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a stand-in with the one method the port calls
  return { get: (name: string) => all[name] } as unknown as ConfigService<Settings, true>;
}

// The global settings with llm.key at `name`, which a test changes as a minute's check would.
function settingsAt(name: string): { settings: GlobalSettings; set: (next: string) => void } {
  let value = name;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a stand-in with the one method the port calls
  const settings = { get: () => value } as unknown as GlobalSettings;
  return {
    settings,
    set: (next): void => {
      value = next;
    },
  };
}

// A model for each key, answering with the key's name, and the keys it was built for.
function namedModels(): { factory: ModelFactory; built: string[] } {
  const built: string[] = [];
  const factory: ModelFactory = ({ name }) => {
    built.push(name);
    return new MockLanguageModelV4({
      doGenerate: (): Promise<Result> => Promise.resolve({ ...ANSWER, content: [{ type: 'text', text: name }] }),
    });
  };
  return { factory, built };
}

const KEYS = { OPENROUTER_API_KEY: OPENROUTER_KEY, LLM_KEYS: { claude: ANTHROPIC_KEY, odd: 'neither-prefix' } };

let logged: string[];

beforeEach(() => {
  logged = [];
  const keep = (line: unknown): void => {
    logged.push(String(line));
  };
  vi.spyOn(Logger.prototype, 'log').mockImplementation(keep);
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(keep);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("The AI's keys", () => {
  it('default is OPENROUTER_API_KEY; each key is on the provider its prefix tells, and one with neither is left out', () => {
    expect(aiKeysOf(KEYS)).toEqual({
      offered: [
        { name: 'default', provider: 'openrouter', apiKey: OPENROUTER_KEY },
        { name: 'claude', provider: 'anthropic', apiKey: ANTHROPIC_KEY },
      ],
      unknown: ['odd'],
    });
  });

  it('without OPENROUTER_API_KEY → no key named default', () => {
    expect(aiKeysOf({ OPENROUTER_API_KEY: '', LLM_KEYS: {} })).toEqual({ offered: [], unknown: [] });
  });
});

describe("The server's model of a key", () => {
  it.each([
    ['anthropic', ANTHROPIC_KEY, 'anthropic.messages', 'claude-haiku-5-5'],
    ['openrouter', OPENROUTER_KEY, 'openrouter', 'anthropic/claude-haiku-5.5'],
  ] as const)('on %s → %s with its fixed model id', (provider, apiKey, providerId, modelId) => {
    const factory = MODEL_FACTORY_PROVIDER.useFactory(configOf({}));

    expect(factory({ name: 'any', provider, apiKey })).toMatchObject({ provider: providerId, modelId });
  });
});

describe('The model port', () => {
  it('builds one model at start for each offered key, and logs the left-out key by its name only', () => {
    const { factory, built } = namedModels();

    const port = new ModelPort(settingsAt('default').settings, factory, configOf(KEYS));

    expect(port).toBeInstanceOf(ModelPort);
    expect(built).toEqual(['default', 'claude']);
    expect(logged.join('\n')).toContain('odd');
    expect(logged.join('\n')).not.toContain('neither-prefix');
  });

  it('gives the model of the key llm.key names when it is asked, each time it is asked', async () => {
    const { factory } = namedModels();
    const { settings, set } = settingsAt('claude');
    const port = new ModelPort(settings, factory, configOf(KEYS));

    const first = port.chosen();
    set('default');
    const second = port.chosen();

    expect(first).toMatchObject({ keyName: 'claude', provider: 'anthropic' });
    expect(second).toMatchObject({ keyName: 'default', provider: 'openrouter' });
    expect((await ask(first?.model ?? fail())).text).toBe('claude');
  });

  it('without OPENROUTER_API_KEY, default → no model, and saving it is refused', () => {
    const { factory } = namedModels();
    const port = new ModelPort(
      settingsAt('default').settings,
      factory,
      configOf({ LLM_KEYS: { claude: ANTHROPIC_KEY } }),
    );

    expect(port.chosen()).toBeNull();
    expect(port.refusal('default')).toBe('The server has no key named default.');
    expect(port.refusal('claude')).toBeNull();
  });
});

describe("The model port's log", () => {
  it("has one line for each call, with the key's name, its provider and the outcome, never a key or the content", async () => {
    const { factory } = namedModels();
    const port = new ModelPort(settingsAt('claude').settings, factory, configOf(KEYS));
    logged = [];

    await ask(port.chosen()?.model ?? fail());

    expect(logged).toEqual(['Model call with key claude on Anthropic: answered, finish stop']);
  });

  it('has a failed call with its cause, never the body', async () => {
    const body = '{"error":{"message":"Insufficient credits for 안녕"}}';
    const failure = new APICallError({
      message: 'refused',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      requestBodyValues: {},
      statusCode: 402,
      responseBody: body,
    });
    const failingFactory: ModelFactory = () =>
      new MockLanguageModelV4({ doGenerate: (): Promise<Result> => Promise.reject(failure) });
    const port = new ModelPort(settingsAt('default').settings, failingFactory, configOf(KEYS));
    logged = [];

    await expect(ask(port.chosen()?.model ?? fail())).rejects.toThrow();

    expect(logged).toEqual([
      'Model call with key default on OpenRouter: failed, APICallError: HTTP 402 from OpenRouter, the OpenRouter credit is used up',
    ]);
    expect(logged.join('\n')).not.toMatch(/Insufficient|안녕|secret-value/u);
  });
});

function fail(): never {
  throw new Error('The port gave no model');
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { anthropicModel, openRouterModel, runFeature } from '../src/assistant/adapter.js';
import { bareHourRule } from '../src/assistant/bare-hours.js';
import { CAMPUS_TERMS_RULES } from '../src/assistant/campus-terms.js';
import { chatAssistant, type ChatAssistantServices } from '../src/assistant/chat/chat-assistant.js';
import { NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { CLIENT_CAPABILITIES, type Feature } from '../src/assistant/feature.js';
import { chatServicesWithoutData } from './chat-services.js';

// The chat's system prompt in two parts (P15 ticket 51): what is the same for every request, which ends at the cache
// breakpoint on the Anthropic path, and the time of the request after it. The real chat feature, over services that
// hold no data (chat-services.ts), sends its requests to a fake fetch in the place of each provider's API. No request leaves the test.

type Json = Record<string, unknown>;
type AnthropicBody = Json & { tools: unknown[]; system: { text: string; cache_control?: unknown }[] };
type OpenRouterBody = Json & { messages: { role: string; content: unknown }[] };

let SERVICES: ChatAssistantServices;

beforeAll(async () => {
  SERVICES = await chatServicesWithoutData();
});

const ALL = { drawsAnswers: true, drawsEvents: true, drawsMeets: true, drawsArea: true };

// The time of the request, then what an hour said bare means at it (P05 ticket 75).
const NOW_LINE = (time: string, at: string): string =>
  `Now in Korea: ${time} (Asia/Seoul, UTC+09:00). Read days and times such as 오늘, 내일, 이번 주 and 점심 against it.
${bareHourRule(new Date(at))}`;

// Answers every request with the provider's text reply, and keeps each request's body.
function fakeApi(reply: () => Response): { bodies: Json[]; fetch: typeof globalThis.fetch } {
  const bodies: Json[] = [];
  const fetch = (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the provider sends JSON text
    bodies.push(JSON.parse(typeof init?.body === 'string' ? init.body : '') as Json);
    return Promise.resolve(reply());
  };
  return { bodies, fetch };
}

const anthropicReply = (): Response =>
  Response.json({
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5-20261007',
    content: [{ type: 'text', text: '안녕하세요' }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  });

const openRouterReply = (): Response =>
  Response.json({
    id: 'gen-1',
    object: 'chat.completion',
    created: 1_800_000_000,
    model: 'anthropic/claude-haiku-5.5',
    choices: [{ index: 0, message: { role: 'assistant', content: '안녕하세요' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  });

const LIMITS = { maxSteps: 2, timeoutMs: 10_000, maxOutputTokens: 1000 };

function asker(userId: string, now: string): Parameters<typeof runFeature>[2] {
  return { userId, now: new Date(now), capabilities: CLIENT_CAPABILITIES, context: NO_CONTEXT };
}

async function send(
  model: Parameters<typeof runFeature>[0],
  feature: Feature,
  userId: string,
  now: string,
): Promise<void> {
  await runFeature(model, feature, asker(userId, now), [{ role: 'user', text: '안녕' }], LIMITS);
}

// What the Anthropic request holds up to and with its breakpoint: the tools, and the system blocks to the one marked.
function cachedPrefix(body: AnthropicBody): string {
  const marked = body.system.findIndex(({ cache_control: mark }) => mark !== undefined);
  expect(marked).toBeGreaterThanOrEqual(0);
  return JSON.stringify({ tools: body.tools, system: body.system.slice(0, marked + 1) });
}

describe('The chat on the Anthropic path, caching by breakpoints', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends equal bytes up to the breakpoint from two features built on different days, at different minutes and for different Users', async () => {
    const api = fakeApi(anthropicReply);
    const model = anthropicModel('test-key', 'claude-haiku-5-5', 'breakpoints', api.fetch);
    // Each feature and its services are built with the clock at its own day, so that a value fixed when the feature
    // is built, not when it is asked, would differ between the two prefixes.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T00:05:00Z'));
    const first = chatAssistant(await chatServicesWithoutData(), ALL);
    await send(model, first, 'user-1', '2026-11-18T00:05:00Z');
    vi.setSystemTime(new Date('2026-11-21T03:41:00Z'));
    const second = chatAssistant(await chatServicesWithoutData(), ALL);
    await send(model, second, 'user-2', '2026-11-21T03:41:00Z');

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the Anthropic provider's request
    const [one, other] = api.bodies as AnthropicBody[];
    expect(first).not.toBe(second);
    expect(cachedPrefix(one)).toBe(cachedPrefix(other));
    expect(one.tools.length).toBeGreaterThan(0);
    // After the breakpoint, each request's own time.
    expect(one.system.at(-1)?.text).toBe(NOW_LINE('2026-11-18 Wednesday 09:05', '2026-11-18T00:05:00Z'));
    expect(other.system.at(-1)?.text).toBe(NOW_LINE('2026-11-21 Saturday 12:41', '2026-11-21T03:41:00Z'));
  });

  it('marks the stable block and sends the time after it, in the same words', async () => {
    const api = fakeApi(anthropicReply);
    const feature = chatAssistant(SERVICES, ALL);

    await send(
      anthropicModel('test-key', 'claude-haiku-5-5', 'breakpoints', api.fetch),
      feature,
      'user-1',
      '2026-11-18T00:05:00Z',
    );

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the Anthropic provider's request
    const [body] = api.bodies as AnthropicBody[];
    expect(body.system).toEqual([
      { type: 'text', text: feature.instructions, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: NOW_LINE('2026-11-18 Wednesday 09:05', '2026-11-18T00:05:00Z') },
    ]);
  });
});

describe('The chat on the OpenRouter path', () => {
  it('sends both system messages, in order, the time line included, as on the Anthropic path, with no cache mark', async () => {
    const anthropic = fakeApi(anthropicReply);
    const openRouter = fakeApi(openRouterReply);
    const feature = chatAssistant(SERVICES, ALL);
    const now = '2026-11-18T00:05:00Z';

    await send(anthropicModel('test-key', 'claude-haiku-5-5', 'breakpoints', anthropic.fetch), feature, 'user-1', now);
    await send(openRouterModel('test-key', 'anthropic/claude-haiku-5.5', openRouter.fetch), feature, 'user-1', now);

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- each provider's request
    const [anthropicBody] = anthropic.bodies as AnthropicBody[];
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- each provider's request
    const [openRouterBody] = openRouter.bodies as OpenRouterBody[];
    const systemMessages = openRouterBody.messages.filter(({ role }) => role === 'system');
    // Both system messages, in order, before the conversation: the stable part, then the time of the request.
    expect(openRouterBody.messages.slice(0, 2)).toEqual([
      { role: 'system', content: [{ type: 'text', text: feature.instructions }] },
      {
        role: 'system',
        content: [{ type: 'text', text: NOW_LINE('2026-11-18 Wednesday 09:05', '2026-11-18T00:05:00Z') }],
      },
    ]);
    expect(systemMessages).toHaveLength(2);
    expect(systemMessages).toEqual(
      anthropicBody.system.map(({ text }) => ({ role: 'system', content: [{ type: 'text', text }] })),
    );
  });
});

describe("The chat's system prompt", () => {
  it.each([
    ['an app that draws nothing', undefined],
    ['an app that draws every answer', ALL],
  ])('of %s keeps the time out of the stable part and the campus short names in it', (_name, options) => {
    const feature = chatAssistant(SERVICES, options);

    expect(feature.instructions).not.toContain('Now in Korea');
    expect(feature.instructions).toContain(CAMPUS_TERMS_RULES);
    expect(feature.requestInstructions?.(new Date('2026-11-18T00:05:00Z'))).toBe(
      NOW_LINE('2026-11-18 Wednesday 09:05', '2026-11-18T00:05:00Z'),
    );
    expect(feature.requestInstructions?.(new Date('2026-11-21T14:59:00Z'))).toBe(
      NOW_LINE('2026-11-21 Saturday 23:59', '2026-11-21T14:59:00Z'),
    );
  });
});

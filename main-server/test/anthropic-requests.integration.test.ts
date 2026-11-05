/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { anthropicModel, type CacheMode, runFeature } from '../src/assistant/adapter.js';
import { type Feature } from '../src/assistant/feature.js';
import { askForJudgement } from '../src/global-events/judgement-model.js';
import { chooseSameEvent } from '../src/global-events/same-event-choice.js';

// What the chat, the Judgement and the same-event choice send to the Anthropic API (spec A01): the provider library
// joined to our callers, with a fake fetch in the place of api.anthropic.com. No request leaves the test.

type Body = Record<string, unknown> & { system?: { cache_control?: unknown }[] };

const USAGE = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

function message(content: unknown[], stopReason: string): Response {
  return Response.json({
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5-20261007',
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: USAGE,
  });
}

const failure = (status: number, type: string): Response =>
  Response.json({ type: 'error', error: { type, message: type } }, { status });

// Answers each request with the next response, and keeps each request's body.
class FakeAnthropic {
  readonly bodies: Body[] = [];
  private responses: (() => Response)[] = [];

  readonly fetch = (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the provider sends JSON text
    this.bodies.push(JSON.parse(typeof init?.body === 'string' ? init.body : '') as Body);
    const next = this.responses.shift();
    return next === undefined ? Promise.reject(new Error('No response left')) : Promise.resolve(next());
  };

  answer(...responses: (() => Response)[]): void {
    this.responses = responses;
    this.bodies.length = 0;
  }
}

const SYSTEM_PROMPT = 'You answer about the campus.';

// A feature with one tool, which counts its runs.
function echoFeature(): { feature: Feature; runs: () => number } {
  let runs = 0;
  return {
    feature: {
      instructions: () => SYSTEM_PROMPT,
      tools: {
        echo: {
          description: 'Says the text back.',
          input: z.object({ text: z.string() }),
          run: (input: unknown): Promise<unknown> => {
            runs += 1;
            return Promise.resolve(input);
          },
        },
      },
    },
    runs: () => runs,
  };
}

const asker = { userId: 'user-1', now: new Date('2026-11-05T03:00:00Z'), capabilities: [] };
const LIMITS = { maxSteps: 4, timeoutMs: 10_000, maxOutputTokens: 1000 };
const ONE_CALL = { timeoutMs: 10_000, maxOutputTokens: 1000 };

const toolCall = (): Response =>
  message([{ type: 'tool_use', id: 'toolu_1', name: 'echo', input: { text: '안녕' } }], 'tool_use');
const text = (): Response => message([{ type: 'text', text: '안녕하세요' }], 'end_turn');
const judgementAnswer = (): Response =>
  message([{ type: 'text', text: JSON.stringify({ announcesEvent: false, sessions: [] }) }], 'end_turn');

const fake = new FakeAnthropic();

async function chat(cache: CacheMode): Promise<{ text: string; runs: number }> {
  const { feature, runs } = echoFeature();
  const reply = await runFeature(
    anthropicModel('test-key', 'claude-haiku-5-5', cache, fake.fetch),
    feature,
    asker,
    [{ role: 'user', text: '안녕' }],
    LIMITS,
  );
  return { text: reply.text, runs: runs() };
}

async function judge(cache: CacheMode): Promise<void> {
  await askForJudgement(
    anthropicModel('test-key', 'claude-haiku-5-5', cache, fake.fetch),
    { title: '특강', text: '11월 6일 오후 3시, 301동 101호' },
    '서울대학교 행사',
    asker.now,
    ONE_CALL,
  );
}

const lastSystemBlock = (body: Body): unknown => body.system?.at(-1)?.cache_control;
const anySampling = (body: Body): boolean => ['temperature', 'top_p', 'top_k'].some((name) => name in body);

describe('The chat on the Anthropic path, caching by breakpoints', () => {
  it('marks the end of the system prompt, caches the conversation, sends effort medium and no sampling', async () => {
    fake.answer(toolCall, text);

    expect((await chat('breakpoints')).text).toBe('안녕하세요');

    expect(fake.bodies).toHaveLength(2);
    for (const body of fake.bodies) {
      expect(body).toMatchObject({ model: 'claude-haiku-5-5', cache_control: { type: 'ephemeral' } });
      expect(body.output_config).toMatchObject({ effort: 'medium' });
      expect(lastSystemBlock(body)).toEqual({ type: 'ephemeral' });
      expect(anySampling(body)).toBe(false);
    }
    expect(fake.bodies[0].system).toEqual([
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ]);
  });
});

describe('The Judgement and the same-event choice on the Anthropic path, caching by breakpoints', () => {
  it('the Judgement marks the end of its instructions only, sends effort medium and no sampling', async () => {
    fake.answer(judgementAnswer);

    await judge('breakpoints');

    const [body] = fake.bodies;
    expect(body).not.toHaveProperty('cache_control');
    expect(lastSystemBlock(body)).toEqual({ type: 'ephemeral' });
    expect(body.system).toHaveLength(1);
    expect(body.output_config).toMatchObject({ effort: 'medium', format: { type: 'json_schema' } });
    expect(anySampling(body)).toBe(false);
  });

  it('the same-event choice marks the end of its instructions only', async () => {
    fake.answer(() => message([{ type: 'text', text: JSON.stringify({ sessions: [] }) }], 'end_turn'));
    const candidate = {
      id: 'event-1',
      title: '특강',
      description: '',
      startsAt: new Date('2026-11-06T06:00:00Z'),
      place: null,
      state: 'published' as const,
    };

    const { modelId } = await chooseSameEvent(
      anthropicModel('test-key', 'claude-haiku-5-5', 'breakpoints', fake.fetch),
      {
        post: { title: '특강', text: '11월 6일 오후 3시' },
        source: '서울대학교 행사',
        sessions: [{ title: '특강', startsAt: candidate.startsAt, place: null, candidates: [candidate] }],
      },
      ONE_CALL,
    );

    expect(modelId).toBe('claude-haiku-5-5-20261007');
    const [body] = fake.bodies;
    expect(body).not.toHaveProperty('cache_control');
    expect(lastSystemBlock(body)).toEqual({ type: 'ephemeral' });
    expect(body.output_config).toMatchObject({ effort: 'medium' });
    expect(anySampling(body)).toBe(false);
  });
});

describe('The other caching modes', () => {
  it('auto caches the chat and the Judgement automatically, with no breakpoint of its own', async () => {
    fake.answer(text, judgementAnswer);

    await chat('auto');
    await judge('auto');

    for (const body of fake.bodies) {
      expect(body.cache_control).toEqual({ type: 'ephemeral' });
      expect(lastSystemBlock(body)).toBeUndefined();
      expect(body.output_config).toMatchObject({ effort: 'medium' });
    }
  });

  it('off caches nothing, and still sends effort medium', async () => {
    fake.answer(text, judgementAnswer);

    await chat('off');
    await judge('off');

    for (const body of fake.bodies) {
      expect(body).not.toHaveProperty('cache_control');
      expect(lastSystemBlock(body)).toBeUndefined();
      expect(body.output_config).toMatchObject({ effort: 'medium' });
    }
  });
});

describe('A momentary overload on the Anthropic path', () => {
  it.each([
    [429, 'rate_limit_error'],
    [529, 'overloaded_error'],
  ])('%i is sent once more at the model call, so the tool runs once', async (status, type) => {
    fake.answer(toolCall, () => failure(status, type), text);

    expect(await chat('breakpoints')).toEqual({ text: '안녕하세요', runs: 1 });
    expect(fake.bodies).toHaveLength(3);
    expect(fake.bodies[2]).toEqual(fake.bodies[1]);
  });

  it('a 429 with the spend limit reached is not sent again', async () => {
    fake.answer(() => failure(429, 'enforced_spend_limit_reached'), text);

    await expect(chat('breakpoints')).rejects.toMatchObject({ statusCode: 429 });
    expect(fake.bodies).toHaveLength(1);
  });
});

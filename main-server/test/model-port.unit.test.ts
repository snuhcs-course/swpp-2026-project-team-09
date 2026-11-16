/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { APICallError, generateText, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { causeOf, type Model, retriedOnce } from '../src/assistant/adapter.js';

// The model port without a provider (spec A01): the one retry of a momentary overload, and what the log says of a
// provider's error. No request leaves the test. test/model-port-keys.unit.test.ts has the models of the AI's keys.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function providerError(statusCode: number, responseBody = '{}', url = ANTHROPIC_URL): APICallError {
  return new APICallError({ message: 'refused', url, requestBodyValues: {}, statusCode, responseBody });
}

const SPEND_CAP = '{"type":"error","error":{"type":"rate_limit_error","message":"enforced_spend_limit_reached"}}';
const ACCOUNT_LIMIT =
  '{"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits."}}';

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

// A model that fails with each of `failures` in turn and answers after them, behind the retry.
function failing(...failures: Error[]): { model: Model; calls: () => number } {
  const queue = [...failures];
  const inner = new MockLanguageModelV4({
    doGenerate: (): Promise<Result> => {
      const failure = queue.shift();
      return failure === undefined ? Promise.resolve(ANSWER) : Promise.reject(failure);
    },
  });
  return {
    model: wrapLanguageModel({ model: inner, middleware: retriedOnce(1000) }),
    calls: () => inner.doGenerateCalls.length,
  };
}

const ask = (model: Model, abortSignal?: AbortSignal): ReturnType<typeof generateText> =>
  generateText({ model, prompt: '안녕', maxRetries: 0, abortSignal });

describe('A model call that fails', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([429, 529])('with %i is sent once more, after a wait, and its answer is the call’s', async (status) => {
    const { model, calls } = failing(providerError(status));

    const answered = ask(model);
    await vi.advanceTimersByTimeAsync(999);
    expect(calls()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);

    expect((await answered).text).toBe('네');
    expect(calls()).toBe(2);
  });

  it('with 429 twice is sent once more only, and fails with the second error', async () => {
    const second = providerError(429);
    const { model, calls } = failing(providerError(429), second);

    const answered = ask(model);
    const failed = expect(answered).rejects.toBe(second);
    await vi.advanceTimersByTimeAsync(1000);

    await failed;
    expect(calls()).toBe(2);
  });

  it.each([
    ['400', providerError(400)],
    ['401', providerError(401)],
    ['402', providerError(402, '{}', OPENROUTER_URL)],
    ['500', providerError(500)],
    ['503', providerError(503)],
    ['429 with the spend limit reached', providerError(429, SPEND_CAP)],
    ['an error of no provider', new Error('The network went away')],
  ])('with %s is not sent again', async (_as, error) => {
    const { model, calls } = failing(error);

    await expect(ask(model)).rejects.toBe(error);
    expect(calls()).toBe(1);
  });
});

describe('A model call that fails when the time runs out', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('after the time ran out is not sent again', async () => {
    const { model, calls } = failing(providerError(529));
    const timeout = new AbortController();
    timeout.abort(new DOMException('The time ran out', 'TimeoutError'));

    await expect(ask(model, timeout.signal)).rejects.toThrow();
    expect(calls()).toBeLessThanOrEqual(1);
  });

  it('is not sent again once the time runs out during the wait', async () => {
    const { model, calls } = failing(providerError(529));
    const timeout = new AbortController();

    const answered = ask(model, timeout.signal);
    const failed = expect(answered).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(500);
    timeout.abort(new DOMException('The time ran out', 'TimeoutError'));
    await vi.advanceTimersByTimeAsync(1000);

    await failed;
    expect(calls()).toBe(1);
  });
});

describe("The log's cause of a provider's error", () => {
  it.each([
    [providerError(529), 'APICallError: HTTP 529 from Anthropic'],
    [providerError(500, '{}', OPENROUTER_URL), 'APICallError: HTTP 500 from OpenRouter'],
    [
      providerError(402, '{}', OPENROUTER_URL),
      'APICallError: HTTP 402 from OpenRouter, the OpenRouter credit is used up',
    ],
    [
      providerError(429, SPEND_CAP),
      "APICallError: HTTP 429 from Anthropic, the Anthropic usage tier's spend limit is reached",
    ],
    [providerError(429), 'APICallError: HTTP 429 from Anthropic'],
    [
      providerError(400, ACCOUNT_LIMIT),
      "APICallError: HTTP 400 from Anthropic, the Anthropic account's spend limit is reached",
    ],
    [
      providerError(400, '{"type":"error","error":{"type":"invalid_request_error"}}'),
      'APICallError: HTTP 400 from Anthropic',
    ],
    [providerError(500, '{}', 'https://example.com/'), 'APICallError: HTTP 500'],
  ])('%#: %s', (error, cause) => {
    expect(causeOf(error)).toBe(cause);
  });

  it('never holds the body', () => {
    expect(causeOf(providerError(400, ACCOUNT_LIMIT))).not.toContain('You have reached');
  });
});

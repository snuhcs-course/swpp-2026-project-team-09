/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';
import { settingsSchema } from '../src/common/settings.js';
import { askForTopics, normalisedTopic } from '../src/interests/topics.js';

// The normaliser, and the topics call over a stand-in model.

type Result = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;

const LIMITS = { timeoutMs: 1000, maxOutputTokens: 100 };

function answering(text: string): MockLanguageModelV4 {
  const result: Result = {
    content: [{ type: 'text', text }],
    finishReason: { unified: 'stop', raw: undefined },
    usage: {
      inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: undefined, text: undefined, reasoning: undefined },
    },
    warnings: [],
  };
  return new MockLanguageModelV4({ doGenerate: () => Promise.resolve(result) });
}

const topicsAnswer = (...topics: string[]): string => JSON.stringify({ topics });

describe('normalisedTopic', () => {
  it.each(['#채용 ', '채 용', '채용'])('makes "%s" 채용', (word) => {
    expect(normalisedTopic(word)).toBe('채용');
  });

  it('makes AI and ai equal', () => {
    expect(normalisedTopic('AI')).toBe(normalisedTopic('ai'));
  });
});

describe('askForTopics', () => {
  it('answers the topics normalised, each once', async () => {
    const model = answering(topicsAnswer('채용', '#AI', 'ai'));

    expect(await askForTopics(model, '2026 하반기 채용박람회', [], LIMITS)).toEqual(['채용', 'ai']);
  });

  it('gives the model the text and the topics in use', async () => {
    const model = answering(topicsAnswer('채용'));

    await askForTopics(model, '커리어 페어', ['채용', '운동'], LIMITS);

    const [call] = model.doGenerateCalls;
    const prompt = JSON.stringify(call?.prompt);
    expect(prompt).toContain('Topics in use: 채용, 운동');
    expect(prompt).toContain('커리어 페어');
    expect(prompt).toContain('채용박람회, 커리어 페어, and 기업 설명회 are all 채용');
  });

  it.each([
    ['no topic', topicsAnswer()],
    ['six topics', topicsAnswer('가', '나', '다', '라', '마', '바')],
    ['a topic with a space', topicsAnswer('커리어 페어')],
    ['a topic of 21 characters', topicsAnswer('가'.repeat(21))],
  ])('answers none for %s', async (_, text) => {
    expect(await askForTopics(answering(text), '행사', [], LIMITS)).toEqual([]);
  });

  it('throws when the answer is not of the schema', async () => {
    await expect(askForTopics(answering('["채용"]'), '행사', [], LIMITS)).rejects.toThrow();
  });
});

describe('TOPICS_TICK_SECONDS', () => {
  const tick = settingsSchema.shape.TOPICS_TICK_SECONDS;

  it('is 60 when unset, and takes 0 to 3600', () => {
    expect(z.object({ TOPICS_TICK_SECONDS: tick }).parse({})).toEqual({ TOPICS_TICK_SECONDS: 60 });
    expect(tick.parse('0')).toBe(0);
    expect(tick.parse('3600')).toBe(3600);
  });

  it.each(['-1', '3601', '1.5', 'often'])('refuses %s', (value) => {
    expect(tick.safeParse(value).success).toBe(false);
  });
});

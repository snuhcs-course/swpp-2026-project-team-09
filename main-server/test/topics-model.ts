/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MockLanguageModelV4 } from 'ai/test';

type Result = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;
type CallOptions = MockLanguageModelV4['doGenerateCalls'][number];

const NO_USAGE: Result['usage'] = {
  inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
};

// Topics for a text that no test names, so that what other files stored is read once and left.
const OTHER_TOPICS = ['기타'];

function textOf({ prompt }: CallOptions): string {
  const message = prompt.findLast(({ role }) => role === 'user');
  const content = message?.role === 'user' ? message.content : [];
  const whole = content.map((part) => (part.type === 'text' ? part.text : '')).join('');
  return whole.slice(whole.indexOf('Text:\n') + 'Text:\n'.length);
}

// Stands for the model of the topics call: it answers the topics given for the longest text the call's text starts
// with, 'fail' failing the call, and keeps each text it was asked about.
export class TopicsModel {
  private readonly answers = new Map<string, string[] | 'fail'>();

  readonly model = new MockLanguageModelV4({
    provider: 'topics',
    modelId: 'topics',
    doGenerate: (options): Promise<Result> => {
      const answer = this.answerFor(textOf(options));
      if (answer === 'fail') {
        return Promise.reject(new Error('The provider failed'));
      }
      return Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify({ topics: answer }) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: NO_USAGE,
        warnings: [],
      });
    },
  });

  answer(text: string, topics: string[] | 'fail'): void {
    this.answers.set(text, topics);
  }

  // How many times a text that starts with these words was asked about.
  asked(start: string): number {
    return this.model.doGenerateCalls.filter((call) => textOf(call).startsWith(start)).length;
  }

  private answerFor(text: string): string[] | 'fail' {
    const key = [...this.answers.keys()].toSorted((a, b) => b.length - a.length).find((each) => text.startsWith(each));
    return key === undefined ? OTHER_TOPICS : (this.answers.get(key) ?? OTHER_TOPICS);
  }
}

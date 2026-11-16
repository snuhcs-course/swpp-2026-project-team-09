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

// The topics, 'fail' for a failed call, or the topics given for the topics in use the call lists.
type Answer = string[] | 'fail' | ((inUse: readonly string[]) => string[]);

function messageOf({ prompt }: CallOptions): string {
  const message = prompt.findLast(({ role }) => role === 'user');
  const content = message?.role === 'user' ? message.content : [];
  return content.map((part) => (part.type === 'text' ? part.text : '')).join('');
}

function textOf(call: CallOptions): string {
  const whole = messageOf(call);
  return whole.slice(whole.indexOf('Text:\n') + 'Text:\n'.length);
}

function inUseOf(call: CallOptions): string[] {
  const whole = messageOf(call);
  const listed = whole.slice('Topics in use: '.length, whole.indexOf('\nText:\n'));
  return listed === 'none' ? [] : listed.split(', ');
}

// Stands for the model of the topics call: it answers what is given for the longest text the call's text starts with,
// and keeps each text it was asked about.
export class TopicsModel {
  private readonly answers = new Map<string, Answer>();

  readonly model = new MockLanguageModelV4({
    provider: 'topics',
    modelId: 'topics',
    doGenerate: (options): Promise<Result> => {
      const answer = this.answerFor(textOf(options));
      if (answer === 'fail') {
        return Promise.reject(new Error('The provider failed'));
      }
      const topics = typeof answer === 'function' ? answer(inUseOf(options)) : answer;
      return Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify({ topics }) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: NO_USAGE,
        warnings: [],
      });
    },
  });

  answer(text: string, topics: Answer): void {
    this.answers.set(text, topics);
  }

  // How many times a text that starts with these words was asked about.
  asked(start: string): number {
    return this.model.doGenerateCalls.filter((call) => textOf(call).startsWith(start)).length;
  }

  private answerFor(text: string): Answer {
    const key = [...this.answers.keys()].toSorted((a, b) => b.length - a.length).find((each) => text.startsWith(each));
    return key === undefined ? OTHER_TOPICS : (this.answers.get(key) ?? OTHER_TOPICS);
  }
}

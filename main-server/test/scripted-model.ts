/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { MockLanguageModelV4 } from 'ai/test';

// One step of the model: a tool to call with its arguments, the text to answer, an error to throw as the provider
// would, or no answer until the call is aborted, as the provider's request is when the time runs out.
export type Step = { tool: string; input: object } | { text: string } | { error: Error } | { stall: true };

type CallOptions = MockLanguageModelV4['doGenerateCalls'][number];
type Result = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;

const NO_USAGE: Result['usage'] = {
  inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
};

function resultOf(step: { tool: string; input: object } | { text: string }, index: number): Result {
  if ('text' in step) {
    return {
      content: [{ type: 'text', text: step.text }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: NO_USAGE,
      warnings: [],
    };
  }
  return {
    content: [
      { type: 'tool-call', toolCallId: `call-${index}`, toolName: step.tool, input: JSON.stringify(step.input) },
    ],
    finishReason: { unified: 'tool-calls', raw: undefined },
    usage: NO_USAGE,
    warnings: [],
  };
}

// Stands for the model behind the model port: each call to the model takes the next step of the script, and every
// call is kept, with the system prompt, the messages and the tool results it was given. Give `model` to startApp.
// A call past the end of the script fails, so that no test reaches OpenRouter.
export class ScriptedModel {
  private steps: Step[] = [];
  private taken = 0;

  readonly model = new MockLanguageModelV4({
    provider: 'scripted',
    modelId: 'scripted',
    // It keeps each call before it asks for the step.
    doGenerate: ({ abortSignal }): Promise<Result> => this.next(abortSignal),
  });

  // Replaces the script and forgets the calls before.
  script(...steps: Step[]): void {
    this.steps = steps;
    this.taken = 0;
    this.model.doGenerateCalls.length = 0;
  }

  // Every call the model received since the script was given.
  received(): CallOptions[] {
    return this.model.doGenerateCalls;
  }

  // The system prompt of the first call.
  system(): string {
    const message = this.received()[0]?.prompt.find(({ role }) => role === 'system');
    if (message?.role !== 'system') {
      throw new Error('The model received no system prompt');
    }
    return message.content;
  }

  // What each tool returned, in order, as the last call received it.
  toolResults(): unknown[] {
    const prompt = this.received().at(-1)?.prompt ?? [];
    return prompt.flatMap((message) =>
      message.role === 'tool'
        ? message.content.flatMap((part) =>
            part.type === 'tool-result' && 'value' in part.output ? [part.output.value] : [],
          )
        : [],
    );
  }

  private next(abortSignal: AbortSignal | undefined): Promise<Result> {
    const step = this.steps[this.taken];
    if (step === undefined) {
      return Promise.reject(new Error(`The script has no step ${this.taken + 1}`));
    }
    this.taken += 1;
    if ('error' in step) {
      return Promise.reject(step.error);
    }
    if ('stall' in step) {
      return new Promise((_, reject) => {
        abortSignal?.addEventListener('abort', () => {
          const reason: unknown = abortSignal.reason;
          reject(reason instanceof Error ? reason : new Error('Aborted'));
        });
      });
    }
    return Promise.resolve(resultOf(step, this.taken));
  }
}

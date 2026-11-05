/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { APICallError, type LanguageModelMiddleware, wrapLanguageModel } from 'ai';
import {
  type Model,
  type RepliedEnd,
  type RunObserver,
  type StepEnd,
  type ToolCallEnd,
} from '../src/assistant/adapter.js';
import { type RawResponses } from './raw-responses.ts';
import { type StepTrace } from './trace.ts';

// The recorder (spec P19, "The recorder"): a wrapper around the model that records each model call, the tools the
// model called and their inputs, the finish reason and the usage, and the run observer the Assistant tells of each
// tool's result. The server's replies stay as they are. It also applies the sampling settings of the run, which the
// server never passes.

// The sampling settings of a run; null leaves the provider's default.
export interface Sampling {
  temperature: number | null;
  topP: number | null;
}

// An error by its name, and a provider's by its HTTP status: never its message, which can hold the request sent.
function nameOf(error: unknown): string {
  if (APICallError.isInstance(error)) {
    return `APICallError: HTTP ${error.statusCode ?? 'none'}`;
  }
  return error instanceof Error ? error.name : typeof error;
}

// A tool's error, which the server's own code threw, with its message, cut short.
function toolErrorOf(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 500) : String(error);
}

// The input of a tool call as the model wrote it, JSON text, read back.
function inputOf(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

type Generated = Awaited<ReturnType<Parameters<NonNullable<LanguageModelMiddleware['wrapGenerate']>>[0]['doGenerate']>>;

// What the provider answered, on the step it belongs to. The result itself goes on to the run untouched. `rawResponse`
// is the response as it came, or without one, as the provider library read it.
function recordResult(
  step: StepTrace,
  { finishReason, usage, content, response }: Generated,
  rawResponse: unknown,
): void {
  const { inputTokens, outputTokens } = usage;
  step.finishReason = finishReason.unified;
  step.usage = {
    inputTokens: inputTokens.total ?? null,
    outputTokens: outputTokens.total ?? null,
    cacheReadTokens: inputTokens.cacheRead ?? null,
    cacheWriteTokens: inputTokens.cacheWrite ?? null,
  };
  for (const part of content) {
    if (part.type === 'tool-call') {
      step.toolCalls.push({ id: part.toolCallId, name: part.toolName, input: inputOf(part.input) });
    } else if (part.type === 'text') {
      step.text += part.text;
    }
  }
  if (finishReason.unified === 'length') {
    step.cut = {
      content,
      reasoningTokens: outputTokens.reasoning ?? null,
      rawResponse: rawResponse ?? response?.body ?? null,
    };
  }
}

export class Recorder implements RunObserver {
  private steps: StepTrace[] = [];
  private reply: RepliedEnd | null = null;

  constructor(
    private readonly sampling: Sampling,
    private readonly rawResponses?: RawResponses,
  ) {}

  // The model with the run's sampling settings, recording each call.
  wrap(model: Model): Model {
    return wrapLanguageModel({ model, middleware: this.middleware() });
  }

  // Starts a turn, forgetting the steps and the reply before.
  begin(): void {
    this.steps = [];
    this.reply = null;
  }

  // The steps of the turn so far.
  take(): StepTrace[] {
    const { steps } = this;
    this.steps = [];
    return steps;
  }

  // The model's own reply of the turn and whether the server added the Approval line, or null when the run answered
  // none.
  takeReply(): RepliedEnd | null {
    const { reply } = this;
    this.reply = null;
    return reply;
  }

  replied(reply: RepliedEnd): void {
    this.reply = reply;
  }

  // A call this turn's steps did not record, such as one of an earlier turn whose tool ended after its time ran out,
  // is dropped, so that it never lands in another turn.
  toolEnded(call: ToolCallEnd): void {
    const recorded = this.steps.flatMap(({ toolCalls }) => toolCalls).findLast(({ id }) => id === call.callId);
    if (recorded !== undefined) {
      Object.assign(recorded, 'result' in call ? { result: call.result } : { error: toolErrorOf(call.error) });
    }
  }

  // The finish reason and the usage are the provider's, recorded by the wrapper; the run says the step ended, and
  // which of its calls failed, such as one whose input the tool's schema refused before it ran.
  stepEnded({ toolErrors }: StepEnd): void {
    const step = this.steps.at(-1);
    if (step === undefined) {
      return;
    }
    step.ended = true;
    for (const { callId, error } of toolErrors) {
      const recorded = step.toolCalls.find(({ id }) => id === callId);
      if (recorded !== undefined && recorded.result === undefined && recorded.error === undefined) {
        recorded.error = toolErrorOf(error);
      }
    }
  }

  private middleware(): LanguageModelMiddleware {
    const { temperature, topP } = this.sampling;
    return {
      specificationVersion: 'v4',
      transformParams: ({ params }) =>
        Promise.resolve({
          ...params,
          ...(temperature === null ? {} : { temperature }),
          ...(topP === null ? {} : { topP }),
        }),
      wrapGenerate: async ({ doGenerate }) => {
        const step: StepTrace = {
          toolCalls: [],
          text: '',
          finishReason: null,
          usage: null,
          latencyMs: 0,
          ended: false,
        };
        this.steps.push(step);
        const started = performance.now();
        try {
          const result = await doGenerate();
          recordResult(step, result, this.rawResponses?.take());
          return result;
        } catch (error) {
          step.error = nameOf(error);
          throw error;
        } finally {
          step.latencyMs = Math.round(performance.now() - started);
        }
      },
    };
  }
}

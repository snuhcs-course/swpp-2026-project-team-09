/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { APICallError, type LanguageModelMiddleware, wrapLanguageModel } from 'ai';
import { type Model, type RunObserver, type ToolCallEnd } from '../src/assistant/adapter.js';
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

export class Recorder implements RunObserver {
  private steps: StepTrace[] = [];

  constructor(private readonly sampling: Sampling) {}

  // The model with the run's sampling settings, recording each call.
  wrap(model: Model): Model {
    return wrapLanguageModel({ model, middleware: this.middleware() });
  }

  // Starts a turn, forgetting the steps before.
  begin(): void {
    this.steps = [];
  }

  // The steps of the turn so far.
  take(): StepTrace[] {
    const { steps } = this;
    this.steps = [];
    return steps;
  }

  // A call this turn's steps did not record, such as one of an earlier turn whose tool ended after its time ran out,
  // is dropped, so that it never lands in another turn.
  toolEnded(call: ToolCallEnd): void {
    const recorded = this.steps.flatMap(({ toolCalls }) => toolCalls).findLast(({ id }) => id === call.callId);
    if (recorded !== undefined) {
      Object.assign(recorded, 'result' in call ? { result: call.result } : { error: toolErrorOf(call.error) });
    }
  }

  // The finish reason and the usage are the provider's, recorded by the wrapper; the run only says the step ended.
  stepEnded(): void {
    const step = this.steps.at(-1);
    if (step !== undefined) {
      step.ended = true;
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
          const { inputTokens, outputTokens } = result.usage;
          step.finishReason = result.finishReason.unified;
          step.usage = {
            inputTokens: inputTokens.total ?? null,
            outputTokens: outputTokens.total ?? null,
            cacheReadTokens: inputTokens.cacheRead ?? null,
            cacheWriteTokens: inputTokens.cacheWrite ?? null,
          };
          for (const part of result.content) {
            if (part.type === 'tool-call') {
              step.toolCalls.push({ id: part.toolCallId, name: part.toolName, input: inputOf(part.input) });
            } else if (part.type === 'text') {
              step.text += part.text;
            }
          }
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

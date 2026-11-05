/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-29  Fable 5.1  prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  APICallError,
  generateText,
  type LanguageModel,
  type LanguageModelMiddleware,
  RetryError,
  stepCountIs,
  tool,
  type ToolSet,
  wrapLanguageModel,
} from 'ai';
import { type ChatMessage, type Feature, type FeatureReply, type Request, type ToolContext } from './feature.js';
import { FoundIds } from './found-ids.js';
import { proposalForModel, type SentProposal } from './proposal.js';
import { isOverload, limitOf, providerOf, waited } from './provider-failures.js';

// The one file that knows the model library, the Vercel AI SDK (ADR 0005): the model port and the loop that runs a
// feature over it. Tools and features do not import the SDK, so that moving to another library replaces this file.

// Injection token of the model port, the one place that talks to the model. The server binds it by MODEL_PROVIDER
// (model-port.ts) to the Anthropic API or to OpenRouter; the tests bind a scripted fake (test/scripted-model.ts).
export const MODEL_PORT = 'MODEL_PORT';

export type Model = Exclude<LanguageModel, string>;

// What the Anthropic requests cache (MODEL_CACHE in src/common/settings.ts).
export type CacheMode = 'breakpoints' | 'auto' | 'off';

// The model named by its OpenRouter id, such as anthropic/claude-haiku-5.5. Only the benchmark and the tests pass a
// fetch of their own. Its options are the callers' own, as before A01: OpenRouter's `provider` routing options.
export function openRouterModel(apiKey: string, modelId: string, fetch?: typeof globalThis.fetch): Model {
  return wrapLanguageModel({ model: createOpenRouter({ apiKey, fetch }).chat(modelId), middleware: retriedOnce() });
}

// The model named by its Anthropic id, such as claude-haiku-5-5, called through the Anthropic API with the options
// chosen for it here (anthropicOptions). Only the benchmark and the tests pass a fetch of their own.
export function anthropicModel(
  apiKey: string,
  modelId: string,
  cache: CacheMode,
  fetch?: typeof globalThis.fetch,
): Model {
  return wrapLanguageModel({
    model: createAnthropic({ apiKey, fetch }).messages(modelId),
    middleware: [anthropicOptions(cache), retriedOnce()],
  });
}

// The option names are those of the installed @ai-sdk/anthropic 4.0.81 (dist/index.js), not guessed:
// - `providerOptions.anthropic.cacheControl` on a system message puts `cache_control` on its text block, an explicit
//   breakpoint (convertToAnthropicPrompt);
// - `providerOptions.anthropic.cacheControl` on the call is the request's top-level `cache_control`, automatic
//   caching, which the API places on the last cacheable block (prepareRequest);
// - `providerOptions.anthropic.effort` is `output_config.effort` (prepareRequest).
// No `temperature`, `topP` or `topK` is set: none of the callers sends one, and the provider drops them for Claude
// Haiku 5.5, whose API rejects them.
const EPHEMERAL = { type: 'ephemeral' } as const;

// Haiku 5.5's default, sent so that the request does not rely on it.
const EFFORT = 'medium';

// The Anthropic request's options. Under `breakpoints`, one breakpoint ends the last system message: the tools and the
// system prompt come before it, and are read back by every request that has the same ones, which in an eval world is
// every case. A call that gives the model tools is a step of the chat's loop, whose next step sends it all again, so
// its conversation is cached automatically too. The Judgement and the same-event choice give no tools: each is one call
// whose last block is unique, so automatic caching would only write it at 1.25 times the price and never read it.
// Under `auto`, every request is cached automatically and nothing else; under `off`, nothing is.
function anthropicOptions(cache: CacheMode): LanguageModelMiddleware {
  return {
    transformParams: ({ params }) => {
      const lastSystem = params.prompt.findLastIndex(({ role }) => role === 'system');
      const isLoopStep = (params.tools ?? []).length > 0;
      const automatic = cache === 'auto' || (cache === 'breakpoints' && isLoopStep);
      const prompt =
        cache !== 'breakpoints' || lastSystem === -1
          ? params.prompt
          : params.prompt.map((message, index) =>
              index === lastSystem
                ? {
                    ...message,
                    providerOptions: {
                      ...message.providerOptions,
                      anthropic: { ...message.providerOptions?.anthropic, cacheControl: EPHEMERAL },
                    },
                  }
                : message,
            );
      return Promise.resolve({
        ...params,
        prompt,
        providerOptions: {
          ...params.providerOptions,
          anthropic: {
            ...params.providerOptions?.anthropic,
            effort: EFFORT,
            ...(automatic ? { cacheControl: EPHEMERAL } : {}),
          },
        },
      });
    },
  };
}

// How long the retry waits, well inside a message's time.
const RETRY_DELAY_MS = 1000;

// Whether a failed call is sent once more: a momentary overload, 429 or 529, and not a 429 that says the spend limit is
// reached, which stays until the limit changes.
export function isRetried(error: unknown): boolean {
  return APICallError.isInstance(error) && isOverload(error);
}

// One more try of a model call that failed with 429 or 529. It sits at the model call, so a step's tools never run
// twice, and it is not the SDK's maxRetries, which retries other statuses too. The call's abort signal, which ends
// with the message's time (timeoutMs), also ends the wait and the try, so the retry never makes a User wait longer.
export function retriedOnce(delayMs: number = RETRY_DELAY_MS): LanguageModelMiddleware {
  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      try {
        return await doGenerate();
      } catch (error) {
        if (!isRetried(error) || params.abortSignal?.aborted === true) {
          throw error;
        }
        await waited(delayMs, params.abortSignal);
        return doGenerate();
      }
    },
  };
}

// What one message may take. Each tool call is one model call, and so is the answer. The time runs over every call
// and tool of the message.
export interface RunLimits {
  maxSteps: number;
  timeoutMs: number;
  // The tokens the model may write in each call.
  maxOutputTokens: number;
}

// The SDK sends no failed call again: it would retry every status the provider may fail with, each retry billed and
// more waiting for the User, who can send the message again instead. A momentary overload (429, 529) is tried once
// more by the model itself (retriedOnce), within `timeoutMs`.
const MAX_RETRIES = 0;

// On OpenRouter: course names, Friends' names and per-Friend results reach the provider, so no provider that collects
// data is used. It adds no ZDR restriction, which could shrink the providers available. The Anthropic provider reads
// none of it: its options are chosen with the model (anthropicOptions).
const PROVIDER_OPTIONS = { openrouter: { provider: { data_collection: 'deny' } } };

// What the reply says when no step wrote any text and the reply shows something beneath it.
export const FIXED_SENTENCE = '아래에서 확인해 보세요.';

// A run that used every step on tools, or that ended with no text and nothing shown.
export class NoAnswerError extends Error {
  override readonly name = 'NoAnswerError';
}

// Injection token of the run observer, which only the benchmark (main-server/eval) binds. The server binds none.
export const RUN_OBSERVER = 'RUN_OBSERVER';

// What a run tells its observer: each tool's call with what it returned or threw, and the end of each step, which is
// one model call. The benchmark records the tool results here, where they are produced, so that a run stopped at the
// step cap still has its last step's. Production passes none, and a run without one does as it did before.
export interface RunObserver {
  toolEnded(call: ToolCallEnd): void;
  stepEnded(step: StepEnd): void;
}

export type ToolCallEnd = { callId: string; name: string; input: unknown } & ({ result: unknown } | { error: unknown });

export interface StepEnd {
  finishReason: string;
  // The step's tool calls that failed, those whose input the tool's schema refused before it ran among them, which
  // toolEnded never hears of.
  toolErrors: { callId: string; name: string; error: unknown }[];
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  cacheReadTokens: number | undefined;
  cacheWriteTokens: number | undefined;
}

// The tool's function, telling the observer what it returned or threw.
function observed(
  name: string,
  run: (input: unknown) => Promise<unknown>,
  observer: RunObserver,
): (input: unknown, options: { toolCallId: string }) => Promise<unknown> {
  return async (input: unknown, { toolCallId }: { toolCallId: string }): Promise<unknown> => {
    try {
      const result = await run(input);
      observer.toolEnded({ callId: toolCallId, name, input, result });
      return result;
    } catch (error) {
      observer.toolEnded({ callId: toolCallId, name, input, error });
      throw error;
    }
  };
}

function toolSetOf({ tools }: Feature, context: ToolContext, observer: RunObserver | undefined): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, { description, input, run }]) => {
      const execute = (value: unknown): Promise<unknown> => run(value, context);
      return [
        name,
        tool({
          description,
          inputSchema: input,
          execute: observer === undefined ? execute : observed(name, execute, observer),
        }),
      ];
    }),
  );
}

// What the model reads of a message: an Assistant's carries a line naming the cards it showed, and one with the values
// of the Proposal it made, which proposeQuest is given again to change it.
function contentOf(message: ChatMessage): string {
  if (message.role === 'user') {
    return message.text;
  }
  const lines = [message.text];
  if (message.cards.length > 0) {
    lines.push(`[Cards shown: ${message.cards.map(({ kind, id }) => `${kind} ${id}`).join(', ')}]`);
  }
  if (message.proposal !== null) {
    lines.push(`[Proposal shown: ${JSON.stringify(proposalForModel(message.proposal))}]`);
  }
  return lines.join('\n\n');
}

// The last Proposal of the conversation, which the app sends back on one message at most.
function lastShown(messages: readonly ChatMessage[]): SentProposal | null {
  const proposals = messages.map((message) => (message.role === 'assistant' ? message.proposal : null));
  return proposals.findLast((proposal) => proposal !== null) ?? null;
}

// Runs the feature on the conversation, the User's new message last, and answers with the text of the model's steps and
// what the presenters put beside it. It throws NoAnswerError when the steps ran out on tools or the run has nothing to
// say or show, and the SDK's errors when the model fails or the time runs out. An observer, if given, is told of each
// tool call and each step's end.
export async function runFeature(
  model: Model,
  feature: Feature,
  asker: Request,
  messages: readonly ChatMessage[],
  { maxSteps, timeoutMs, maxOutputTokens }: RunLimits,
  observer?: RunObserver,
): Promise<FeatureReply> {
  const context: ToolContext = {
    ...asker,
    capabilities: new Set(asker.capabilities),
    found: new FoundIds(),
    shown: lastShown(messages),
    presented: { mapButtons: [], cards: [], proposal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
  const { steps, finishReason } = await generateText({
    model,
    instructions: feature.instructions(asker.now),
    messages: messages.map((message) => ({ role: message.role, content: contentOf(message) })),
    tools: toolSetOf(feature, context, observer),
    stopWhen: stepCountIs(maxSteps),
    maxRetries: MAX_RETRIES,
    maxOutputTokens,
    providerOptions: PROVIDER_OPTIONS,
    timeout: { totalMs: timeoutMs },
    onStepEnd:
      observer === undefined
        ? undefined
        : (step): void => {
            const { usage } = step;
            observer.stepEnded({
              finishReason: step.finishReason,
              toolErrors: step.content.flatMap((part) =>
                part.type === 'tool-error' ? [{ callId: part.toolCallId, name: part.toolName, error: part.error }] : [],
              ),
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              cacheReadTokens: usage.inputTokenDetails.cacheReadTokens,
              cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens,
            });
          },
  });
  const reply = finishReason === 'tool-calls' ? null : replyOf(textOf(steps), finishReason, feature, context);
  if (reply === null) {
    throw new NoAnswerError(`No answer within ${maxSteps} steps`);
  }
  return reply;
}

// The reply of a run that ended: the model's text, the fixed sentence over what it showed without any, or none.
function replyOf(text: string, finishReason: string, feature: Feature, context: ToolContext): FeatureReply | null {
  const presented = { ...context.presented, cards: feature.cardsAfterRun?.(context) ?? context.presented.cards };
  if (text !== '') {
    return { ...presented, text, noTextFinishReason: null };
  }
  if (presented.cards.length === 0 && presented.mapButtons.length === 0 && presented.proposal === null) {
    return null;
  }
  return { ...presented, text: FIXED_SENTENCE, noTextFinishReason: finishReason };
}

// The model may write part of its answer beside a tool call and close with a line in its last step, or write nothing
// there: the reply is every step's text in order, a step that repeats the one before it left out.
function textOf(steps: readonly { text: string }[]): string {
  const texts = steps.map((step) => step.text.trim()).filter((text) => text !== '');
  return texts.filter((text, index) => index === 0 || text !== texts[index - 1]).join('\n\n');
}

// Why a run failed, for the server's log: the error's name and, from the model's provider, the HTTP status. Never an
// error's message or body, which can hold the request the SDK sent, and so what the User wrote.
export function causeOf(error: unknown): string {
  if (RetryError.isInstance(error)) {
    return `${causeOf(error.lastError)} (RetryError: ${error.reason})`;
  }
  if (APICallError.isInstance(error)) {
    const provider = providerOf(error);
    return `APICallError: HTTP ${error.statusCode ?? 'none'}${provider === null ? '' : ` from ${provider}`}${limitOf(error)}`;
  }
  if (error instanceof NoAnswerError) {
    return `${error.name}: ${error.message}`;
  }
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'TimeoutError: the time per message ran out';
  }
  return error instanceof Error ? error.name : typeof error;
}

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
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
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
  type SystemModelMessage,
  tool,
  type ToolSet,
  wrapLanguageModel,
} from 'ai';
import { withApprovalLine } from './approval-line.js';
import { type ChatMessage, type Feature, type FeatureReply, type Request, type ToolContext } from './feature.js';
import { withoutWalkSentences } from './gathering/plan-reply.js';
import { foundWithMentions } from './mentions.js';
import { isOverload, limitOf, providerOf, waited } from './provider-failures.js';
import { keptRefusal, lookupBeside, textBeside } from './refusals/refusals.js';
import { FIXED_SENTENCE, wordlessText } from './wordless-reply.js';
import { lastShown, messagesFor, textOf } from './run-messages.js';

// The one file that knows the model library, the Vercel AI SDK (ADR 0005): the model port and the loop that runs a
// feature over it. Tools and features do not import the SDK, so that moving to another library replaces this file.

export type Model = Exclude<LanguageModel, string>;

// What the Anthropic requests cache (MODEL_CACHE in src/common/settings.ts).
export type CacheMode = 'breakpoints' | 'auto' | 'off';

// The model with one log line for each of its calls, which `describe` gives: the key's name and its provider, never a
// key's value, and the outcome. Never what the call sent or got back. A retry of the call (retriedOnce) is in the same
// line.
export function loggedModel(model: Model, describe: string, log: (line: string) => void): Model {
  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async ({ doGenerate }) => {
        try {
          const result = await doGenerate();
          log(`Model call with ${describe}: answered, finish ${result.finishReason.unified}`);
          return result;
        } catch (error) {
          log(`Model call with ${describe}: failed, ${causeOf(error)}`);
          throw error;
        }
      },
    },
  });
}

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

// The Anthropic request's options. Under `breakpoints`, one breakpoint ends the first system message: the tools and the
// system prompt's stable part (Feature.instructions) come before it, and are read back by every request that has the
// same ones, whoever asks and whenever, within the cache's five minutes. What changes per request, the time in Korea
// (Feature.requestInstructions), is a second system message after the breakpoint, and is not cached on its own. A
// call that gives the model tools is a step of the chat's loop, whose next step sends it all again, so
// its conversation is cached automatically too. The Judgement and the same-event choice give no tools: each is one call
// whose last block is unique, so automatic caching would only write it at 1.25 times the price and never read it.
// Under `auto`, every request is cached automatically and nothing else; under `off`, nothing is.
function anthropicOptions(cache: CacheMode): LanguageModelMiddleware {
  return {
    transformParams: ({ params }) => {
      const stableSystem = params.prompt.findIndex(({ role }) => role === 'system');
      const isLoopStep = (params.tools ?? []).length > 0;
      const automatic = cache === 'auto' || (cache === 'breakpoints' && isLoopStep);
      const prompt =
        cache !== 'breakpoints' || stableSystem === -1
          ? params.prompt
          : params.prompt.map((message, index) =>
              index === stableSystem
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

// A run that used every step on tools, or that ended with no text and nothing shown.
export class NoAnswerError extends Error {
  override readonly name = 'NoAnswerError';
}

// Injection token of the run observer, which only the benchmark (main-server/eval) binds. The server binds none.
export const RUN_OBSERVER = 'RUN_OBSERVER';

// What a run tells its observer: each tool's call with what it returned or threw, the end of each step, which is one
// model call, and the reply's text before the server added the Approval line. The benchmark records the tool results
// here, where they are produced, so that a run stopped at the step cap still has its last step's. Production passes
// none, and a run without one does as it did before.
export interface RunObserver {
  toolEnded(call: ToolCallEnd): void;
  stepEnded(step: StepEnd): void;
  replied(reply: RepliedEnd): void;
}

// The model's own reply: its steps' text, or the fixed sentence when they wrote none, as replies were before the
// Approval line. `approvalLine` is whether the server added the line after it.
export interface RepliedEnd {
  modelText: string;
  approvalLine: boolean;
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

// The feature's system prompt as the SDK sends it: its stable part, then the lines of this request, each a system
// message of its own, in that order on every provider.
function systemOf(feature: Feature, now: Date): SystemModelMessage[] {
  const stable: SystemModelMessage = { role: 'system', content: feature.instructions };
  const perRequest = feature.requestInstructions?.(now);
  return perRequest === undefined ? [stable] : [stable, { role: 'system', content: perRequest }];
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
    found: foundWithMentions(asker.context.mentions),
    shown: lastShown(messages),
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
  const { steps, finishReason } = await generateText({
    model,
    instructions: systemOf(feature, asker.now),
    messages: messagesFor(messages, asker),
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
  const reply = finishReason === 'tool-calls' ? null : await replyOf(textOf(steps), finishReason, feature, context);
  if (reply === null) {
    throw new NoAnswerError(`No answer within ${maxSteps} steps`);
  }
  return withLine(reply, messages, observer);
}

// The reply with the Approval line, when it needs one, the observer told of the text before it.
function withLine(reply: FeatureReply, messages: readonly ChatMessage[], observer?: RunObserver): FeatureReply {
  const userTexts = messages.flatMap((message) => (message.role === 'user' ? [message.text] : []));
  const { text, added } = withApprovalLine(reply.text, reply.cards, userTexts);
  observer?.replied({ modelText: reply.text, approvalLine: added });
  return { ...reply, text };
}

// The reply of a run that ended, once the feature has changed what it presented: the model's text, a refusal's lines
// without any, or what a reply with no words says (wordlessText).
async function replyOf(
  text: string,
  finishReason: string,
  feature: Feature,
  context: ToolContext,
): Promise<FeatureReply | null> {
  await feature.afterRun?.(context);
  const presented = { ...context.presented, cards: feature.cardsAfterRun?.(context) ?? context.presented.cards };
  presented.refusal = keptRefusal(presented);
  presented.lookup = lookupBeside(presented);
  if (presented.answer !== null || presented.lookup !== null || presented.refusal !== null) {
    delete presented.offers;
  }
  const said = textBeside(withoutWalkSentences(text, (presented.answer?.plans.length ?? 0) > 0), presented.refusal);
  if (said !== '') {
    return { ...presented, text: said, noTextFinishReason: null };
  }
  const wordless = wordlessText(presented);
  if (wordless === null) {
    return null;
  }
  return { ...presented, text: wordless, noTextFinishReason: wordless === FIXED_SENTENCE ? finishReason : null };
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

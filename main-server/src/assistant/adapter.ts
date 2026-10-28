/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { APICallError, generateText, type LanguageModel, RetryError, stepCountIs, tool, type ToolSet } from 'ai';
import {
  type Asker,
  type ChatMessage,
  type Choice,
  type Feature,
  type FeatureReply,
  type ResolutionLog,
  type ToolContext,
} from './feature.js';
import { FoundIds } from './found-ids.js';
import { othersText } from './others-text.js';
import { proposalForModel, type SentProposal } from './proposal.js';

// The one file that knows the model library, the Vercel AI SDK (ADR 0005): the model port and the loop that runs a
// feature over it. Tools and features do not import the SDK, so that moving to another library replaces this file.

// Injection token of the model port, the one place that talks to the model. The server binds it to OpenRouter; the
// tests bind a scripted fake (test/scripted-model.ts).
export const MODEL_PORT = 'MODEL_PORT';

export type Model = Exclude<LanguageModel, string>;

// The model named by its OpenRouter id, such as anthropic/claude-haiku-5.5.
export function openRouterModel(apiKey: string, modelId: string): Model {
  return createOpenRouter({ apiKey }).chat(modelId);
}

// What one message may take. Each tool call is one model call, and so is the answer. The time runs over every call
// and tool of the message.
export interface RunLimits {
  maxSteps: number;
  timeoutMs: number;
  // The tokens the model may write in each call.
  maxOutputTokens: number;
}

// A failed model call is not sent again: each retry is another call billed to the credit and more waiting for the
// User, who can send the message again instead. Were it ever retried, the retries would stay within `timeoutMs`,
// which also aborts them.
const MAX_RETRIES = 0;

// A run that used every step on tools and never answered.
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

// The line under a User's message that names the candidate they tapped. A Friend's name and an event's title, which
// other people wrote, go inside delimiters.
function chosenLine({ kind, id, label, words }: Choice): string {
  const name = kind === 'place' ? label : othersText(kind === 'friend' ? 'friend.name' : 'globalEvent.title', label);
  return `[Chosen: ${kind} ${id} "${name}" for "${words}"]`;
}

// What the model reads of a message: a User's carries a line naming the candidate it answers with, an Assistant's a
// line naming the cards it showed and one with the values of the Proposal it made, which proposeQuest is given again
// to change it.
function contentOf(message: ChatMessage): string {
  if (message.role === 'user') {
    return message.chosen === null ? message.text : `${message.text}\n\n${chosenLine(message.chosen)}`;
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

// The candidate the User's new message answers with, which the server checked again and proposeQuest takes as if a
// resolver had returned it in this message. An earlier message's is only read.
function foundChosen(messages: readonly ChatMessage[]): FoundIds {
  const found = new FoundIds();
  const last = messages.at(-1);
  if (last?.role === 'user' && last.chosen !== null) {
    found.add(last.chosen.kind, [last.chosen.id]);
  }
  return found;
}

// Runs the feature on the conversation, the User's new message last, and answers with the model's last text and what
// the presenters put beside it. It throws NoAnswerError when the steps ran out on tools, and the SDK's errors when the
// model fails or the time runs out. The resolvers record their answers in `resolutions`. An observer, if given, is
// told of each tool call and each step's end.
export async function runFeature(
  model: Model,
  feature: Feature,
  asker: Asker,
  messages: readonly ChatMessage[],
  { maxSteps, timeoutMs, maxOutputTokens }: RunLimits,
  resolutions: ResolutionLog,
  observer?: RunObserver,
): Promise<FeatureReply> {
  const context: ToolContext = {
    ...asker,
    found: foundChosen(messages),
    shown: lastShown(messages),
    presented: { mapButtons: [], cards: [], proposal: null, choices: [] },
    resolutions,
  };
  const { text, finishReason } = await generateText({
    model,
    instructions: feature.instructions(asker.now),
    messages: messages.map((message) => ({ role: message.role, content: contentOf(message) })),
    tools: toolSetOf(feature, context, observer),
    stopWhen: stepCountIs(maxSteps),
    maxRetries: MAX_RETRIES,
    maxOutputTokens,
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
  if (finishReason === 'tool-calls' || text.trim() === '') {
    throw new NoAnswerError(`No answer within ${maxSteps} steps`);
  }
  return { text, ...context.presented };
}

// Why a run failed, for the server's log: the error's name and, from the model's provider, the HTTP status. Never an
// error's message or body, which can hold the request the SDK sent, and so what the User wrote.
export function causeOf(error: unknown): string {
  if (RetryError.isInstance(error)) {
    return `${causeOf(error.lastError)} (RetryError: ${error.reason})`;
  }
  if (APICallError.isInstance(error)) {
    // OpenRouter answers 402 once the credit is used up.
    const credit = error.statusCode === 402 ? ', the OpenRouter credit is used up' : '';
    return `APICallError: HTTP ${error.statusCode ?? 'none'}${credit}`;
  }
  if (error instanceof NoAnswerError) {
    return `${error.name}: ${error.message}`;
  }
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'TimeoutError: the time per message ran out';
  }
  return error instanceof Error ? error.name : typeof error;
}

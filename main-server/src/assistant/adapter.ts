/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { APICallError, generateText, type LanguageModel, RetryError, stepCountIs, tool, type ToolSet } from 'ai';
import { type Asker, type ChatMessage, type Feature, type FeatureReply, type ToolContext } from './feature.js';

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

function toolSetOf({ tools }: Feature, context: ToolContext): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, { description, input, run }]) => [
      name,
      tool({ description, inputSchema: input, execute: (value: unknown) => run(value, context) }),
    ]),
  );
}

// What the model reads of a message: an Assistant's carries a line naming the cards it showed.
function contentOf(message: ChatMessage): string {
  if (message.role === 'user' || message.cards.length === 0) {
    return message.text;
  }
  const cards = message.cards.map(({ kind, id }) => `${kind} ${id}`).join(', ');
  return `${message.text}\n\n[Cards shown: ${cards}]`;
}

// Runs the feature on the conversation, the User's new message last, and answers with the model's last text and what
// the presenters put beside it. It throws NoAnswerError when the steps ran out on tools, and the SDK's errors when the
// model fails or the time runs out.
export async function runFeature(
  model: Model,
  feature: Feature,
  asker: Asker,
  messages: readonly ChatMessage[],
  { maxSteps, timeoutMs, maxOutputTokens }: RunLimits,
): Promise<FeatureReply> {
  const context: ToolContext = { ...asker, presented: { mapButtons: [] } };
  const { text, finishReason } = await generateText({
    model,
    instructions: feature.instructions(asker.now),
    messages: messages.map((message) => ({ role: message.role, content: contentOf(message) })),
    tools: toolSetOf(feature, context),
    stopWhen: stepCountIs(maxSteps),
    maxRetries: MAX_RETRIES,
    maxOutputTokens,
    timeout: { totalMs: timeoutMs },
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

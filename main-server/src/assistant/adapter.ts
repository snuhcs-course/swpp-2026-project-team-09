/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, type LanguageModel, stepCountIs, tool, type ToolSet } from 'ai';
import { type ChatMessage, type Feature, type ToolContext } from './feature.js';

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

// The model calls a message may take: each tool call is one, and so is the answer.
const MAX_STEPS = 8;

function toolSetOf({ tools }: Feature, context: ToolContext): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, { description, input, run }]) => [
      name,
      tool({ description, inputSchema: input, execute: (value: unknown) => run(value, context) }),
    ]),
  );
}

// Runs the feature on the conversation, the User's new message last, and answers with the model's last text.
export async function runFeature(
  model: Model,
  feature: Feature,
  context: ToolContext,
  messages: readonly ChatMessage[],
): Promise<string> {
  const { text } = await generateText({
    model,
    instructions: feature.instructions(context.now),
    messages: messages.map(({ role, text: content }) => ({ role, content })),
    tools: toolSetOf(feature, context),
    stopWhen: stepCountIs(MAX_STEPS),
  });
  return text;
}

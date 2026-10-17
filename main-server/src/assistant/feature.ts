/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';

// The parts of an AI feature that know nothing of the model library (ADR 0005). A tool is a zod schema of its input
// and a plain function that calls the main server's services as the signed-in User. A feature is an entry point with
// its own system prompt and its own set of tools. A later AI feature is a new Feature that reuses tools, never more
// tools on another feature, so that one feature cannot reach another's data. `adapter.ts` alone runs them.

// A card the Assistant showed: what it is and its id. The model is given only these, never the card's data from an
// earlier message, and calls a tool again when it needs it.
export interface CardReference {
  kind: 'quest' | 'globalEvent';
  id: string;
}

// One message of a conversation, as the app sends it: the User's text, or the Assistant's with the cards it showed.
export type ChatMessage = { role: 'user'; text: string } | { role: 'assistant'; text: string; cards: CardReference[] };

// Who asks and when. Every tool of a run is given it.
export interface ToolContext {
  readonly userId: string;
  readonly now: Date;
}

export interface Tool {
  // What the model reads to choose the tool.
  readonly description: string;
  readonly input: z.ZodType;
  // Answers with what the model is given: plain data, or an explicit "none" with the reason.
  readonly run: (input: unknown, context: ToolContext) => Promise<unknown>;
}

// A tool whose function receives its input checked against its schema.
export function defineTool<Schema extends z.ZodType>(definition: {
  description: string;
  input: Schema;
  run: (input: z.output<Schema>, context: ToolContext) => Promise<unknown>;
}): Tool {
  const { description, input, run } = definition;
  return { description, input, run: (value, context) => run(input.parse(value), context) };
}

export interface Feature {
  // The system prompt of a request made at `now`.
  instructions(now: Date): string;
  // By the name the model calls each one.
  readonly tools: Readonly<Record<string, Tool>>;
}

// What a tool answers when nothing matches, so that the model says so instead of answering from elsewhere.
export interface NoneFound {
  result: 'none';
  reason: string;
}

export function noneFound(reason: string): NoneFound {
  return { result: 'none', reason };
}

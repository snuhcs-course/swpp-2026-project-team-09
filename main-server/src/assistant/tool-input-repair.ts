/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { InvalidToolInputError, type ToolCallRepairFunction, type ToolSet } from 'ai';
import { z } from 'zod';

// A tool call the SDK refused for its input, made again once with what the model meant (P05 tickets 82 and 84), and
// checked by the SDK again: a field it gave null left out, as when it copies an unset condition on screen; and a number
// it wrote as a string ("7000", "7,000", "7000원") read as that number, on a field that takes a number. A field that
// takes a string keeps its digits, a field that takes null keeps it (its call is never refused), and an input still
// wrong is refused as before.

// Digits, with commas between thousands or none, then 원 or nothing.
const NUMBER_WORDS = /^\s*(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*원?\s*$/u;

// What a field's JSON Schema says of its type, and the tool's fields.
const fieldSchema = z.looseObject({
  type: z.union([z.string(), z.array(z.string())]).optional(),
  anyOf: z.array(z.unknown()).optional(),
  oneOf: z.array(z.unknown()).optional(),
});
const toolSchema = z.looseObject({ properties: z.record(z.string(), z.unknown()).optional() });
const objectInput = z.record(z.string(), z.unknown());

function takesNumber(schema: unknown): boolean {
  const parsed = fieldSchema.safeParse(schema);
  if (!parsed.success) {
    return false;
  }
  const { type, anyOf = [], oneOf = [] } = parsed.data;
  const types = typeof type === 'string' ? [type] : (type ?? []);
  return (
    types.some((one) => one === 'number' || one === 'integer') || [...anyOf, ...oneOf].some((one) => takesNumber(one))
  );
}

function inputOf(written: string): Record<string, unknown> | null {
  try {
    const parsed = objectInput.safeParse(JSON.parse(written));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const repairedToolCall: ToolCallRepairFunction<ToolSet> = async ({ toolCall, error, inputSchema }) => {
  const input = InvalidToolInputError.isInstance(error) ? inputOf(toolCall.input) : null;
  if (input === null) {
    return null;
  }
  const schema = toolSchema.safeParse(await inputSchema({ toolName: toolCall.toolName }));
  const properties = schema.success ? (schema.data.properties ?? {}) : {};
  const meant = Object.entries(input).flatMap(([key, value]): [string, unknown][] => {
    if (value === null) {
      return [];
    }
    if (typeof value === 'string' && NUMBER_WORDS.test(value) && takesNumber(properties[key])) {
      return [[key, Number(value.replaceAll(/[^\d.]/gu, ''))]];
    }
    return [[key, value]];
  });
  const repaired = JSON.stringify(Object.fromEntries(meant));
  return repaired === JSON.stringify(input) ? null : { ...toolCall, input: repaired };
};

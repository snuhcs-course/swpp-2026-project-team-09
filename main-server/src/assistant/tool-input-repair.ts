/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';

// A tool call refused for its input, made again once with what the model meant (P05 tickets 82 and 84), which the SDK
// checks again: a field it gave null left out, as when it copies an unset condition on screen; and a number it wrote as
// a string ("7000", "7,000", "7000원") read as that number, on a field that takes a number. A field that takes a string
// keeps its digits, a field that takes null keeps it (its call is never refused), and an input still wrong is refused
// as before. Each refused call leaves one log line: the tool, each refused field with what it expected, and what was
// changed, by the fields' names alone, never a value the model gave, which may hold the User's words. The model
// library's side, the refused call itself, is the adapter's (adapter.ts).

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
// A validation issue as zod gives it: where, what kind, and the type it expected, if any.
const issueSchema = z.looseObject({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string(),
  expected: z.string().optional(),
});
const withIssues = z.looseObject({ issues: z.array(z.unknown()) });
const withCause = z.looseObject({ cause: z.unknown() });

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

// The validation issues of a refusal, found down its causes: "maxPrice invalid_union", "from invalid_type (expected
// string)". Only names, codes and types.
function issuesOf(error: unknown): string[] {
  for (let cause = error, depth = 0; cause !== undefined && depth < 5; depth += 1) {
    const found = withIssues.safeParse(cause);
    if (found.success) {
      return found.data.issues.flatMap((issue) => {
        const parsed = issueSchema.safeParse(issue);
        if (!parsed.success) {
          return [];
        }
        const { path, code, expected } = parsed.data;
        return [`${path.join('.') || '(input)'} ${code}${expected === undefined ? '' : ` (expected ${expected})`}`];
      });
    }
    const next = withCause.safeParse(cause);
    cause = next.success ? next.data.cause : undefined;
  }
  return [];
}

export interface RefusedCall {
  toolName: string;
  // The input as the model wrote it, JSON.
  input: string;
  // The tool's input as a JSON Schema.
  schema: unknown;
  // What the SDK refused it with.
  error: unknown;
}

// The input the model meant, JSON, or null when nothing in it can be read otherwise; and the refusal's log line.
export function meantInput({ toolName, input: written, schema, error }: RefusedCall): {
  input: string | null;
  line: string;
} {
  const input = inputOf(written);
  const parsed = toolSchema.safeParse(schema);
  const properties = parsed.success ? (parsed.data.properties ?? {}) : {};
  const leftOut: string[] = [];
  const read: string[] = [];
  const meant = Object.entries(input ?? {}).flatMap(([key, value]): [string, unknown][] => {
    if (value === null) {
      leftOut.push(key);
      return [];
    }
    if (typeof value === 'string' && NUMBER_WORDS.test(value) && takesNumber(properties[key])) {
      read.push(key);
      return [[key, Number(value.replaceAll(/[^\d.]/gu, ''))]];
    }
    return [[key, value]];
  });
  const changes = [
    ...(leftOut.length === 0 ? [] : [`null left out: ${leftOut.join(', ')}`]),
    ...(read.length === 0 ? [] : [`read as a number: ${read.join(', ')}`]),
  ];
  const issues = issuesOf(error);
  const line = `The model's ${toolName} call was refused: ${issues.length === 0 ? 'no issue given' : issues.join('; ')}; ${
    changes.length === 0 ? 'not made again' : `made again with ${changes.join('; ')}`
  }`;
  return { input: changes.length === 0 ? null : JSON.stringify(Object.fromEntries(meant)), line };
}

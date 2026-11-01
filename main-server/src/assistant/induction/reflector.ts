/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { PATTERN_MAX, REPLACE_MAX, type RuleText } from '../../places/induced-rules.js';
import { completeText, type Model } from '../adapter.js';

// The reflector of the induction (P07 ticket 07): the Assistant's model, called offline with the words the matcher got
// wrong, the Place each meant with its name and the short forms the generator already makes of it, the matcher's
// answer, and the rules in force; it answers up to three rules in the language of induced-rules.ts. GEPA's reflection
// LM reading traces and feedback (research note 11 §3.1), and RuleChef's rule writer (§3.2). Nothing it writes is in
// force until the gate has replayed it.

// Injection token of the reflector; the server binds a ModelReflector over the model port.
export const REFLECTOR = 'REFLECTOR';

export const RULES_PER_CALL = 3;
// Room for the model's reasoning tokens as well as the rules: Haiku-class models think for most of their output.
const MAX_OUTPUT_TOKENS = 6000;
const FORMS_SHOWN = 8;

export interface Failure {
  words: string;
  expected: { name: string; forms: string[] };
  answer: { result: 'none' } | { result: 'several'; names: string[] } | { result: 'one'; name: string };
}

export interface Proposal extends RuleText {
  why: string;
}

// What one call gave: the rules read out of the answer, and a note when the answer was not what was asked for.
export interface Reflection {
  proposals: Proposal[];
  note: string | null;
}

export interface Reflector {
  // The OpenRouter id of the model, written on each rule it proposed.
  readonly modelId: string;
  // `rules` are in force; `tried` were proposed before in the run and did not help.
  propose(failures: readonly Failure[], rules: readonly RuleText[], tried: readonly RuleText[]): Promise<Reflection>;
}

const proposalSchema = z.object({
  kind: z.enum(['name', 'words']),
  pattern: z.string().min(1).max(PATTERN_MAX),
  replace: z.string().min(1).max(REPLACE_MAX),
  why: z
    .string()
    .default('')
    .transform((text) => text.slice(0, 300)),
});

const answerSchema = z.object({ rules: z.array(z.unknown()) });

export const SYSTEM = [
  'You improve the place matcher of a campus assistant for Seoul National University by writing matching rules.',
  "The matcher maps a student's words to one of the catalog's Places by exact names, taught aliases, short forms a",
  'generator makes from each name (학관 of 학생회관, 중도 of 중앙도서관), and loose matches. You are shown words it got',
  'wrong, the Place the student meant with its normalised name and the forms the generator already makes of it, and the',
  "matcher's current answer.",
  '',
  'Write up to 3 rules that would fix several of these words and words nobody has typed yet. A rule never names a',
  'Place: what it writes is matched by the catalog as any words are.',
  '',
  'A rule is {"kind": "name" | "words", "pattern": "...", "replace": "...", "why": "..."}.',
  '- kind "name": the pattern is matched against a Place\'s normalised name (NFC, lower case, no spaces) and the',
  '  replacement writes a form students say for it. {"kind":"name","pattern":"^(.{1,3}?)(?:과학|과|학)?대학$",',
  '  "replace":"$1대"} makes 경영대 of 경영대학 and 자연대 of 자연과학대학.',
  '- kind "words": the pattern is matched against the student\'s words and the replacement writes what to look up',
  '  instead. {"kind":"words","pattern":"^윗(.+)$","replace":"상부$1"} looks 윗공대 up as 상부공대.',
  '',
  'Patterns are JavaScript RegExp with the u flag, restricted: literals, character classes, ., \\d, ^ and $, |,',
  'groups (...) or (?:...) that are at most optional, and the quantifiers ? * + {m,n} on a single character or class',
  'only, never on a group; no backreferences or lookaround; at most 80 characters. A replacement is literal text and',
  '$1 to $9, at most 40 characters.',
  '',
  'Do not write a rule that maps one literal words to one Place: that is an alias, which the assistant learns',
  'elsewhere. Do not repeat a rule in force or one tried before. Prefer a rule that fits two or more of the failures.',
  '',
  'Answer with JSON only: {"rules": [...]}, and {"rules": []} when no rule would help.',
].join('\n');

function answerText({ answer }: Failure): string {
  if (answer.result === 'none') {
    return 'nothing';
  }
  return answer.result === 'one' ? `the wrong Place ${answer.name}` : `a question among ${answer.names.join(', ')}`;
}

function listed(list: readonly RuleText[]): string[] {
  return list.length === 0
    ? ['(none)']
    : list.map(({ kind, pattern, replace }) => `- ${kind}: ${pattern} → ${replace}`);
}

export function promptOf(
  failures: readonly Failure[],
  rules: readonly RuleText[],
  tried: readonly RuleText[] = [],
): string {
  const lines = failures.map(
    (failure, index) =>
      `${index + 1}. words "${failure.words}" meant ${failure.expected.name} (forms the generator makes: ` +
      `${failure.expected.forms.slice(0, FORMS_SHOWN).join(', ') || 'none'}); the matcher answered ${answerText(failure)}.`,
  );
  return [
    'Failures:',
    ...lines,
    '',
    'Rules in force:',
    ...listed(rules),
    '',
    'Rules tried before that did not help:',
    ...listed(tried),
  ].join('\n');
}

// The proposals in the model's text: the rules of the JSON object it holds that have the shape asked for, and a note
// when there is no such object or some rule is dropped.
export function proposalsOf(text: string): Reflection {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return { proposals: [], note: `no JSON object in ${text.length} characters` };
  }
  let answer: unknown;
  try {
    answer = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { proposals: [], note: 'the JSON does not parse' };
  }
  const parsed = answerSchema.safeParse(answer);
  if (!parsed.success) {
    return { proposals: [], note: 'the JSON has no rules list' };
  }
  const rules = parsed.data.rules.map((rule) => proposalSchema.safeParse(rule));
  const dropped = rules.filter((rule) => !rule.success).length;
  return {
    proposals: rules.flatMap((rule) => (rule.success ? [rule.data] : [])).slice(0, RULES_PER_CALL),
    note: dropped === 0 ? null : `${dropped} of the rules had not the shape asked for`,
  };
}

export class ModelReflector implements Reflector {
  constructor(
    private readonly model: Model,
    readonly modelId: string,
    private readonly timeoutMs: number,
  ) {}

  async propose(
    failures: readonly Failure[],
    rules: readonly RuleText[],
    tried: readonly RuleText[],
  ): Promise<Reflection> {
    const { text, finishReason } = await completeText(this.model, {
      system: SYSTEM,
      prompt: promptOf(failures, rules, tried),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      timeoutMs: this.timeoutMs,
    });
    const reflection = proposalsOf(text);
    return finishReason === 'stop'
      ? reflection
      : {
          ...reflection,
          note: `the model stopped for ${finishReason}${reflection.note === null ? '' : `; ${reflection.note}`}`,
        };
  }
}

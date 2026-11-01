/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { normaliseWords } from '../common/normalise-words.js';

// The matching rules the model proposes and the replay verifies (P07 ticket 07, research note 11 §3): a small language
// the server executes, so that a request still calls no model. A `name` rule turns a Place's normalised name into a
// form students say it as (^(.{1,3}?)(?:과학|과|학)?대학$ → $1대 makes 경영대 of 경영대학); a `words` rule turns the User's
// words into what to look up instead (^윗(.+)$ → 상부$1). A rule never names a Place: what it writes is matched by the
// catalog as any words are. The syntax is JavaScript's RegExp with the u flag, restricted so that no pattern can run
// away on words of at most 50 characters: literals, classes, ., \d, anchors, alternation, groups that are at most
// optional, and quantifiers on single atoms.

export type RuleKind = 'name' | 'words';

export interface RuleText {
  kind: RuleKind;
  pattern: string;
  replace: string;
}

export interface CompiledRule extends RuleText {
  id: string;
  regex: RegExp;
}

export const PATTERN_MAX = 80;
export const REPLACE_MAX = 40;
// A form students say is two characters or more (abbreviations.ts); the words are at most 50 (resolution_events).
const FORM_MIN = 2;
const WORDS_MAX = 50;
const GROUP_DEPTH_MAX = 3;
const REPEAT_MAX = 10;

// What a rule may write: what normalised names and words are made of.
const WRITTEN = /^[가-힣ㄱ-ㅎa-z0-9]+$/u;
// Literal characters and $1 to $9.
const REPLACE = /^(?:[^$\\]|\$[1-9])+$/u;
const BOUNDED = /^\{\d{1,2}(?:,\d{1,2})?\}$/u;
const ESCAPABLE = new Set(['d', '.', '(', ')', '[', ']', '{', '}', '^', '$', '|', '?', '*', '+', '\\']);

export type Refusal =
  'pattern too long' | 'pattern not allowed' | 'pattern does not compile' | 'replacement not allowed';

type Kind = 'atom' | 'open' | 'close' | 'quantifier' | 'anchor' | 'bar' | 'bad';

interface Token {
  kind: Kind;
  // The index after the token.
  next: number;
  // A quantifier that is `?`, allowed after a group and, as lazy, after another quantifier.
  optional: boolean;
}

// Where a class opened at `at` closes, or -1: `]` ends it, `\` escapes the next character, and it is never empty.
function classEnd(chars: readonly string[], at: number): number {
  let index = at + 1;
  if (chars[index] === '^') {
    index += 1;
  }
  if (chars[index] === ']') {
    return -1;
  }
  for (; index < chars.length; index += 1) {
    if (chars[index] === '\\') {
      index += 1;
    } else if (chars[index] === ']') {
      return index;
    }
  }
  return -1;
}

// Where a bounded quantifier opened at `at` closes, or -1: {m} or {m,n} with n at most REPEAT_MAX.
function braceEnd(chars: readonly string[], at: number): number {
  const end = chars.indexOf('}', at);
  if (end < 0) {
    return -1;
  }
  const text = chars.slice(at, end + 1).join('');
  if (!BOUNDED.test(text)) {
    return -1;
  }
  const bounds = text.slice(1, -1).split(',').map(Number);
  return Math.max(...bounds) <= REPEAT_MAX && (bounds[1] ?? 0) >= (bounds[0] ?? 0) ? end : -1;
}

function tokenOf(chars: readonly string[], at: number): Token {
  const bad: Token = { kind: 'bad', next: at + 1, optional: false };
  const character = chars[at] ?? '';
  switch (character) {
    case '\\': {
      const escaped = chars[at + 1];
      return escaped !== undefined && ESCAPABLE.has(escaped) ? { kind: 'atom', next: at + 2, optional: false } : bad;
    }
    case '[': {
      const end = classEnd(chars, at);
      return end < 0 ? bad : { kind: 'atom', next: end + 1, optional: false };
    }
    case '(':
      if (chars[at + 1] === '?') {
        return chars[at + 2] === ':' ? { kind: 'open', next: at + 3, optional: false } : bad;
      }
      return { kind: 'open', next: at + 1, optional: false };
    case ')':
      return { kind: 'close', next: at + 1, optional: false };
    case '?':
    case '*':
    case '+':
      return { kind: 'quantifier', next: at + 1, optional: character === '?' };
    case '{': {
      const end = braceEnd(chars, at);
      return end < 0 ? bad : { kind: 'quantifier', next: end + 1, optional: false };
    }
    case '^':
    case '$':
      return { kind: 'anchor', next: at + 1, optional: false };
    case '|':
      return { kind: 'bar', next: at + 1, optional: false };
    case ']':
    case '}':
      return bad;
    default:
      return { kind: 'atom', next: at + 1, optional: false };
  }
}

// What may follow what: a quantifier only an atom, a group as `?`, or a quantifier once more as lazy `?`; a close or
// a bar not the start, an open or another bar.
type Last = Kind | 'start' | 'lazy';

function follows(token: Token, last: Last): boolean {
  if (token.kind === 'quantifier') {
    return last === 'atom' || (token.optional && (last === 'close' || last === 'quantifier'));
  }
  if (token.kind === 'close' || token.kind === 'bar') {
    return last !== 'start' && last !== 'open' && last !== 'bar';
  }
  return token.kind !== 'bad';
}

// What the token leaves as the last thing read: a quantifier after a quantifier is the lazy `?`.
function after(last: Last, token: Token): Last {
  return token.kind === 'quantifier' && last === 'quantifier' ? 'lazy' : token.kind;
}

// Why a pattern is refused, or null when it is allowed.
export function checkPattern(pattern: string): Refusal | null {
  if (pattern.length > PATTERN_MAX) {
    return 'pattern too long';
  }
  const chars = Array.from(pattern);
  let last: Last = 'start';
  let depth = 0;
  for (let at = 0; at < chars.length;) {
    const token = tokenOf(chars, at);
    if (!follows(token, last)) {
      return 'pattern not allowed';
    }
    if (token.kind === 'open') {
      depth += 1;
    } else if (token.kind === 'close') {
      depth -= 1;
    }
    if (depth < 0 || depth > GROUP_DEPTH_MAX) {
      return 'pattern not allowed';
    }
    last = after(last, token);
    at = token.next;
  }
  return depth === 0 && last !== 'start' && last !== 'open' && last !== 'bar' ? null : 'pattern not allowed';
}

export function checkReplace(replace: string): Refusal | null {
  return replace.length <= REPLACE_MAX && REPLACE.test(replace) ? null : 'replacement not allowed';
}

// The rule compiled, or why it is refused.
export function compileRule(id: string, rule: RuleText): { rule: CompiledRule } | { refusal: Refusal } {
  const refusal = checkPattern(rule.pattern) ?? checkReplace(rule.replace);
  if (refusal !== null) {
    return { refusal };
  }
  try {
    return { rule: { ...rule, id, regex: new RegExp(rule.pattern, 'u') } };
  } catch {
    return { refusal: 'pattern does not compile' };
  }
}

// The form a name rule makes of a normalised name, or null: two characters or more, shorter than the name and unlike
// it, written as names are.
export function formOf(rule: CompiledRule, name: string): string | null {
  if (rule.kind !== 'name' || !rule.regex.test(name)) {
    return null;
  }
  const form = normaliseWords(name.replace(rule.regex, rule.replace));
  return form.length >= FORM_MIN && form.length < name.length && form !== name && WRITTEN.test(form) ? form : null;
}

// What a words rule looks up for the words, or null: other words, written as words are, at most 50 characters.
export function rewriteOf(rule: CompiledRule, words: string): string | null {
  if (rule.kind !== 'words' || !rule.regex.test(words)) {
    return null;
  }
  const rewritten = normaliseWords(words.replace(rule.regex, rule.replace));
  return rewritten !== '' && rewritten !== words && rewritten.length <= WORDS_MAX && WRITTEN.test(rewritten)
    ? rewritten
    : null;
}

// The rules of the table compiled, in their order, and the ids of those the language refuses, which a run of another
// build may have written.
export function compileRules(rows: readonly ({ id: string } & RuleText)[]): {
  rules: CompiledRule[];
  refused: { id: string; refusal: Refusal }[];
} {
  const rules: CompiledRule[] = [];
  const refused: { id: string; refusal: Refusal }[] = [];
  for (const row of rows) {
    const compiled = compileRule(row.id, row);
    if ('rule' in compiled) {
      rules.push(compiled.rule);
    } else {
      refused.push({ id: row.id, refusal: compiled.refusal });
    }
  }
  return { rules, refused };
}

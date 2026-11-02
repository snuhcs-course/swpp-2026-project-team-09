/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 * 2026-11-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { normaliseWords } from '../common/normalise-words.js';

// The matching rules the model proposes and the replay verifies (P07 ticket 07, research note 11 §3): a small language
// the server executes, so that a request still calls no model. A `name` rule turns a Place's normalised name into a
// form students say it as (^(.{1,3}?)(?:과학|과|학)?대학$ → $1대 makes 경영대 of 경영대학); a `words` rule turns the User's
// words into what to look up instead (^윗(.+)$ → 상부$1). A rule never names a Place: what it writes is matched by the
// catalog as any words are. The syntax is JavaScript's RegExp with the u flag, restricted so that no pattern can run
// away on words of at most 50 characters: literals, classes, ., \d, anchors, alternation, groups that are at most
// optional, and quantifiers on single atoms, with at most PATHS_MAX ways through its quantifiers and alternatives.

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
// The ways a match may try: with no repeated group, each quantifier and each alternation is passed at most once on a
// try, so their counts multiplied, times the starts of a pattern not anchored by a leading ^, bound the backtracking.
// `*` and `+` count as every length of the longest words: ^(.+)(.+)$ and [가-힣]+관 fit, ^.*.*.*!$ does not.
const PATHS_MAX = (WORDS_MAX + 1) ** 2;

// What a rule may write: what normalised names and words are made of.
const WRITTEN = /^[가-힣ㄱ-ㅎa-z0-9]+$/u;
// Literal characters and $1 to $9.
const REPLACE = /^(?:[^$\\]|\$[1-9])+$/u;
const BOUNDED = /^\{\d{1,2}(?:,\d{1,2})?\}$/u;
const ESCAPABLE = new Set(['d', '.', '(', ')', '[', ']', '{', '}', '^', '$', '|', '?', '*', '+', '\\']);

export type Refusal =
  | 'pattern too long'
  | 'pattern not allowed'
  | 'pattern too slow'
  | 'pattern does not compile'
  | 'replacement not allowed';

type Kind = 'atom' | 'open' | 'close' | 'quantifier' | 'anchor' | 'bar' | 'bad';

interface Token {
  kind: Kind;
  // The index after the token.
  next: number;
  // A quantifier that is `?`, allowed after a group and, as lazy, after another quantifier.
  optional: boolean;
  // A quantifier's count of repeats it may try.
  ways: number;
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

// A bounded quantifier opened at `at`, {m} or {m,n} with n at most REPEAT_MAX: where it closes and its count of
// repeats, or null.
function braceOf(chars: readonly string[], at: number): { end: number; ways: number } | null {
  const end = chars.indexOf('}', at);
  if (end < 0) {
    return null;
  }
  const text = chars.slice(at, end + 1).join('');
  if (!BOUNDED.test(text)) {
    return null;
  }
  const [low = 0, high = low] = text.slice(1, -1).split(',').map(Number);
  return high <= REPEAT_MAX && high >= low ? { end, ways: high - low + 1 } : null;
}

function tokenOf(chars: readonly string[], at: number): Token {
  const bad: Token = { kind: 'bad', next: at + 1, optional: false, ways: 1 };
  const character = chars[at] ?? '';
  switch (character) {
    case '\\': {
      const escaped = chars[at + 1];
      return escaped !== undefined && ESCAPABLE.has(escaped) ? { ...bad, kind: 'atom', next: at + 2 } : bad;
    }
    case '[': {
      const end = classEnd(chars, at);
      return end < 0 ? bad : { ...bad, kind: 'atom', next: end + 1 };
    }
    case '(':
      if (chars[at + 1] === '?') {
        return chars[at + 2] === ':' ? { ...bad, kind: 'open', next: at + 3 } : bad;
      }
      return { ...bad, kind: 'open' };
    case ')':
      return { ...bad, kind: 'close' };
    case '?':
      return { ...bad, kind: 'quantifier', optional: true, ways: 2 };
    case '*':
    case '+':
      return { ...bad, kind: 'quantifier', ways: WORDS_MAX + 1 };
    case '{': {
      const brace = braceOf(chars, at);
      return brace === null ? bad : { ...bad, kind: 'quantifier', next: brace.end + 1, ways: brace.ways };
    }
    case '^':
    case '$':
      return { ...bad, kind: 'anchor' };
    case '|':
      return { ...bad, kind: 'bar' };
    case ']':
    case '}':
      return bad;
    default:
      return { ...bad, kind: 'atom' };
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

// The ways a token adds: a quantifier its repeats, but not as the lazy `?` of another; a close or the end the
// alternatives of its group, counted in `bars`, one per open group and one for the whole.
function waysOf(token: Token, last: Last, bars: number[]): number {
  if (token.kind === 'quantifier') {
    return last === 'quantifier' ? 1 : token.ways;
  }
  if (token.kind === 'bar') {
    bars[bars.length - 1] = (bars.at(-1) ?? 0) + 1;
  } else if (token.kind === 'open') {
    bars.push(0);
  } else if (token.kind === 'close') {
    return 1 + (bars.pop() ?? 0);
  }
  return 1;
}

// Why a pattern is refused, or null when it is allowed.
export function checkPattern(pattern: string): Refusal | null {
  if (pattern.length > PATTERN_MAX) {
    return 'pattern too long';
  }
  const chars = Array.from(pattern);
  let last: Last = 'start';
  const bars = [0];
  let paths = 1;
  for (let at = 0; at < chars.length;) {
    const token = tokenOf(chars, at);
    if (!follows(token, last) || (token.kind === 'close' && bars.length === 1)) {
      return 'pattern not allowed';
    }
    paths *= waysOf(token, last, bars);
    if (bars.length - 1 > GROUP_DEPTH_MAX) {
      return 'pattern not allowed';
    }
    last = after(last, token);
    at = token.next;
  }
  if (bars.length !== 1 || last === 'start' || last === 'open' || last === 'bar') {
    return 'pattern not allowed';
  }
  const starts = chars[0] === '^' && bars[0] === 0 ? 1 : WORDS_MAX + 1;
  return paths * (1 + (bars[0] ?? 0)) * starts > PATHS_MAX ? 'pattern too slow' : null;
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

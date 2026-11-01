/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type Failure, type Proposal, type Reflection, type Reflector } from '../src/assistant/induction/reflector.js';
import { type Instance, type LabelRow } from '../src/assistant/induction/instances.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { type CompiledRule, compileRule, type RuleText } from '../src/places/induced-rules.js';

// What the induction's unit tests share (P07 ticket 07): three hand-made Places, rules, instances, rows and a reflector
// that answers a script.

const DAY_MS = 24 * 60 * 60 * 1000;
export const START = new Date('2026-10-20T01:00:00Z');
const OLD = new Date(START.getTime() - 30 * DAY_MS);

export const places: PlaceDto[] = [
  { id: 'hall', number: '63', name: '학생회관', latitude: 0, longitude: 0 },
  { id: 'business', number: '58', name: '경영대학', latitude: 0, longitude: 0 },
  { id: 'science', number: '25', name: '자연과학대학', latitude: 0, longitude: 0 },
];

export function rule(kind: 'name' | 'words', pattern: string, replace: string): CompiledRule {
  const compiled = compileRule(`${kind}:${pattern}`, { kind, pattern, replace });
  if ('refusal' in compiled) {
    throw new Error(compiled.refusal);
  }
  return compiled.rule;
}

// The rule that drops a leading 뷁.
export const PREFIX = rule('words', '^뷁(.+)$', '$1');

export function instance(words: string, placeId: string, accounts: string[], heldOut = false): Instance {
  return { words, placeId, accounts, eventIds: [], heldOut };
}

let ids = 0;

type Partial = Pick<LabelRow, 'userId' | 'words' | 'outcome'> & {
  chosenId?: string;
  minute?: number;
  // Days before START; the default is long ago.
  daysOld?: number;
};

export function row({ minute = 0, chosenId, daysOld, ...rest }: Partial): LabelRow {
  ids += 1;
  return {
    id: String(ids).padStart(3, '0'),
    chosenId: chosenId ?? null,
    onboardedAt: daysOld === undefined ? OLD : new Date(START.getTime() - daysOld * DAY_MS),
    createdAt: new Date(START.getTime() + minute * 60_000),
    ...rest,
  };
}

export class ScriptedReflector implements Reflector {
  readonly modelId = 'scripted';
  readonly calls: { failures: Failure[]; rules: RuleText[]; tried: RuleText[] }[] = [];

  constructor(private readonly answers: Proposal[][]) {}

  propose(failures: readonly Failure[], rules: readonly RuleText[], tried: readonly RuleText[]): Promise<Reflection> {
    this.calls.push({ failures: [...failures], rules: [...rules], tried: [...tried] });
    return Promise.resolve({ proposals: this.answers[this.calls.length - 1] ?? [], note: null });
  }
}

export function proposal(kind: 'name' | 'words', pattern: string, replace: string): Proposal {
  return { kind, pattern, replace, why: '' };
}

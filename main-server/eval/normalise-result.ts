/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type Names } from './normalise.ts';
import { clockOf, isRecord } from './readers.ts';

// What a 공강 tool answered, read as a case's `expect.results` writes it (eval/expect.ts), for the judgement suite: ids
// and keys as `seed`, times as HH:MM in Korea, others' text unwrapped, and the words only the reply uses left out.

const TIMES = new Set(['start', 'end', 'leaveBy']);
const UNREAD = new Set(['id', 'key', 'title', 'department', 'lines', 'reason', 'collectedAt', 'place']);
const OTHERS_TEXT = /^<data label="[^"]*">(.*)<\/data>$/su;

function unwrapped(input: unknown): unknown {
  return typeof input === 'string' ? (OTHERS_TEXT.exec(input)?.[1] ?? input) : input;
}

// The name of the item a tool needs an answer about, given as its name or with its id.
function itemName(input: unknown): unknown {
  return unwrapped(isRecord(input) ? input.name : input);
}

export function normaliseResult(input: unknown, names: Names): unknown {
  if (Array.isArray(input)) {
    return input.map((entry) => normaliseResult(entry, names));
  }
  if (!isRecord(input)) {
    return unwrapped(input);
  }
  const given = input.id ?? input.key;
  const seed = typeof given === 'string' ? { seed: names(given) ?? given } : {};
  const needs = 'needs' in input ? { result: 'needs' } : {};
  const fields = Object.entries(input).flatMap(([field, entry]): [string, unknown][] => {
    if (UNREAD.has(field) || (field === 'name' && given !== undefined)) {
      return [];
    }
    if (TIMES.has(field)) {
      return [[field, clockOf(entry)]];
    }
    return [[field, field === 'item' ? itemName(entry) : normaliseResult(entry, names)]];
  });
  return { ...seed, ...needs, ...Object.fromEntries(fields) };
}

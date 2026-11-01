/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Question, type Subset } from './question-builders.ts';
import { CONDITION_QUESTIONS } from './questions-conditions.ts';
import { CONTEXT_QUESTIONS } from './questions-context.ts';
import { WORD_QUESTIONS } from './questions-words.ts';

export type { Question } from './question-builders.ts';

// The questions of the large world (P05 ticket 02b), in the order of its cases.
export const QUESTIONS: readonly Question[] = [...WORD_QUESTIONS, ...CONDITION_QUESTIONS, ...CONTEXT_QUESTIONS];

// The subsets whose server recall reaches 1.0 by ticket 11: E7's, whose floor asks it, and V and L, of which the search
// should not lose a word it was given. P, T1 and C may wait for search stage 1 (P05 spec, "Further Notes").
export const REACHED_BY_THE_TICKETS: ReadonlySet<Subset> = new Set(['V', 'L', 'T2', 'H', 'S', 'N', 'R', 'O', 'B']);

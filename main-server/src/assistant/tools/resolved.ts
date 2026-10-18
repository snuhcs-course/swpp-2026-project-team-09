/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type NoneFound, noneFound } from '../feature.js';

// The most candidates a resolver gives. More than that, the model asks the User for more words.
const CANDIDATES_MAX = 10;

// What a resolver answers about the User's words: that they name nothing, with the reason, the one thing they name,
// or the several they could name, of which the model asks the User to choose. It never guesses.
export type Resolved<Candidate> =
  NoneFound | { result: 'one'; candidate: Candidate } | { result: 'several'; candidates: Candidate[]; more: boolean };

// The candidates as a resolver answers them. `reason` says why there is none.
export function resolved<Candidate>(candidates: readonly Candidate[], reason: string): Resolved<Candidate> {
  const [first] = candidates;
  if (first === undefined) {
    return noneFound(reason);
  }
  if (candidates.length === 1) {
    return { result: 'one', candidate: first };
  }
  // More match than are given: the User's words should narrow them.
  return {
    result: 'several',
    candidates: candidates.slice(0, CANDIDATES_MAX),
    more: candidates.length > CANDIDATES_MAX,
  };
}

// The ids a resolver gives the model, which proposeQuest then accepts.
export function givenIds<Candidate extends { id: string }>(answer: Resolved<Candidate>): string[] {
  if (answer.result === 'one') {
    return [answer.candidate.id];
  }
  return answer.result === 'several' ? answer.candidates.map(({ id }) => id) : [];
}

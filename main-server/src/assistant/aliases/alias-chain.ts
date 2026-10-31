/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { MIN_SHARE, MIN_SUPPORTERS, type Standing } from './alias-rules.js';
import {
  type Accounts,
  accountsOf,
  addAccount,
  type ChainRow,
  FAILURE,
  openState,
  placeOf,
  placeState,
  sessionsOf,
  type State,
  SUCCESS,
  type Transitions,
  transitionsOf,
  walkOf,
} from './alias-sessions.js';

// Everyone's alias of words from the absorbing Markov chain of Ponnusamy et al. (AAAI 2020, §4; research note 07
// §1.1), P07 ticket 06. The states are the resolver's readings (alias-sessions.ts) and the transition probabilities
// their counts over the sessions of the window. From the words' own reading s, the expected visits N_st to each Place
// state t, the fundamental matrix (I − Q)⁻¹ (Eq. 16), times t's one-step success r⁺_t give Φ∞(t) (Eq. 14). The alias
// is the candidate of greatest Φ∞ (Eq. 18) among those that beat the reading's own one-step success Φ₁ = r⁺_s
// (Eq. 12); it is none when the reading, a Place, beats them all, the paper's self-partition: the words succeed on
// their own.

export interface Chain {
  transitions: Transitions;
  // Per words and Place, the distinct accounts that rejected the Place for the words, whatever their age.
  rejecters: Accounts;
}

export function chainOf(rows: readonly ChainRow[]): Chain {
  const walks = sessionsOf(rows)
    .map((session) => walkOf(session))
    .filter((walk) => walk !== null);
  const rejecters: Accounts = new Map();
  for (const { outcome, words, chosenId, userId } of rows) {
    if (outcome === 'rejected' && chosenId !== null && words !== '') {
      addAccount(rejecters, words, chosenId, userId);
    }
  }
  return { transitions: transitionsOf(walks), rejecters };
}

// The reading of words by the rules alone, the chain's source for them: the Places the matcher without the learned
// aliases answers. Our resolver is deterministic, so the paper's distribution over a source's interpretations (Eq. 5,
// 20) is this one point.
export function sourceOf(words: string, placeIds: readonly string[]): State {
  const [first] = placeIds;
  return first !== undefined && placeIds.length === 1 ? placeState(first) : openState(words);
}

interface Row {
  // Each transient state's probability from the state (Eq. 8).
  next: Map<State, number>;
  // r⁺: the probability of success in one step (Eq. 9).
  success: number;
}

// Q's row for a state, from its counts. A state never left has an empty row: nothing is known of it.
function rowOf({ counts }: Transitions, state: State): Row {
  const next = new Map<State, number>();
  const out = counts.get(state);
  if (out === undefined) {
    return { next, success: 0 };
  }
  const total = [...out.values()].reduce((sum, value) => sum + value, 0);
  for (const [to, value] of out) {
    if (to !== SUCCESS && to !== FAILURE) {
      next.set(to, value / total);
    }
  }
  return { next, success: (out.get(SUCCESS) ?? 0) / total };
}

// Where the series stops: when this little mass is still in transient states, or after this many steps.
const MASS_LEFT = 1e-9;
const STEPS_MAX = 1000;

function massOf(mass: ReadonlyMap<State, number>): number {
  return [...mass.values()].reduce((sum, value) => sum + value, 0);
}

// N_s·, the expected visits to each state from the source: the series Σ Qⁿ of the fundamental matrix (Eq. 16),
// followed only where the mass goes. The paper truncates a breadth-first search at depth 5 instead.
export function visitsFrom(transitions: Transitions, source: State): Map<State, number> {
  const visits = new Map<State, number>();
  let mass = new Map<State, number>([[source, 1]]);
  for (let step = 0; step < STEPS_MAX && massOf(mass) > MASS_LEFT; step += 1) {
    const next = new Map<State, number>();
    for (const [state, amount] of mass) {
      visits.set(state, (visits.get(state) ?? 0) + amount);
      for (const [to, probability] of rowOf(transitions, state).next) {
        next.set(to, (next.get(to) ?? 0) + amount * probability);
      }
    }
    mass = next;
  }
  return visits;
}

// The probability that a walk from the source ever visits the target: the series again, with the target absorbing.
// Unlike the expected visits, it is not raised by a Place visited again and again, so the share is taken on it.
export function firstPassage(transitions: Transitions, source: State, target: State): number {
  if (source === target) {
    return 1;
  }
  let reached = 0;
  let mass = new Map<State, number>([[source, 1]]);
  for (let step = 0; step < STEPS_MAX && massOf(mass) > MASS_LEFT; step += 1) {
    const next = new Map<State, number>();
    for (const [state, amount] of mass) {
      for (const [to, probability] of rowOf(transitions, state).next) {
        if (to === target) {
          reached += amount * probability;
        } else {
          next.set(to, (next.get(to) ?? 0) + amount * probability);
        }
      }
    }
    mass = next;
  }
  return reached;
}

// A Place reached from the reading, with the paper's numbers and ticket 03's guards.
export interface Candidate extends Standing {
  // The probability that a session from the reading reaches the Place at all.
  reach: number;
  // Of the reach of every Place but the reading itself.
  share: number;
  // Φ∞: N_st, the expected visits to the Place from the reading, times the Place's one-step success.
  success: number;
}

export interface Decision {
  source: State;
  // Φ₁: the reading's own one-step success.
  ownSuccess: number;
  // Every Place reached, the greatest Φ∞ first.
  candidates: Candidate[];
  alias: Candidate | null;
}

// The greatest Φ∞ first; more supporters, fewer rejecters and then the id break a tie.
function byBest(a: Candidate, b: Candidate): number {
  return (
    b.success - a.success ||
    b.supporters - a.supporters ||
    a.rejecters - b.rejecters ||
    a.placeId.localeCompare(b.placeId)
  );
}

function qualifies(candidate: Candidate, ownSuccess: number): boolean {
  return candidate.success > ownSuccess && candidate.supporters >= MIN_SUPPORTERS && candidate.share >= MIN_SHARE;
}

export function aliasOf(chain: Chain, words: string, source: State): Decision {
  const { transitions, rejecters } = chain;
  const visits = visitsFrom(transitions, source);
  const ownSuccess = rowOf(transitions, source).success;
  const sourcePlace = placeOf(source);
  const reached = [...visits].flatMap(([state, expected]) => {
    const placeId = placeOf(state);
    if (placeId === null || placeId === sourcePlace) {
      return [];
    }
    return [{ placeId, state, reach: firstPassage(transitions, source, state), expected }];
  });
  const total = reached.reduce((sum, { reach }) => sum + reach, 0);
  const candidates = reached
    .map(({ placeId, state, reach, expected }): Candidate => ({
      placeId,
      reach,
      share: total === 0 ? 0 : reach / total,
      success: expected * rowOf(transitions, state).success,
      supporters: accountsOf(transitions.supporters, words, placeId),
      rejecters: accountsOf(rejecters, words, placeId),
    }))
    .toSorted(byBest);
  // Φ∞ of the reading itself, N_ss · r⁺_s, which a candidate must beat; nothing when the words are left open.
  const own = sourcePlace === null ? 0 : (visits.get(source) ?? 1) * ownSuccess;
  const best = candidates.find((candidate) => qualifies(candidate, ownSuccess));
  return { source, ownSuccess, candidates, alias: best !== undefined && best.success > own ? best : null };
}

// What the chain says of one Place for the words, reached from the reading or not.
export function standingOf(chain: Chain, decision: Decision, words: string, placeId: string): Candidate {
  const reached = decision.candidates.find((candidate) => candidate.placeId === placeId);
  return (
    reached ?? {
      placeId,
      reach: 0,
      share: 0,
      success: 0,
      supporters: accountsOf(chain.transitions.supporters, words, placeId),
      rejecters: accountsOf(chain.rejecters, words, placeId),
    }
  );
}

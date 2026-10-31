/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { ACCOUNT_AGE_DAYS, SESSION_GAP_MINUTES } from './alias-rules.js';

// The sessions and walks the alias chain is counted from (P07 ticket 06): Ponnusamy et al., "Feedback-Based
// Self-Learning in Large-Scale Conversational AI Agents" (AAAI 2020), §3 and §4.3, read over resolution_events.

// A Place resolution event with its account's onboarding, as the chain reads it.
export interface ChainRow {
  id: string;
  userId: string;
  onboardedAt: Date | null;
  words: string;
  outcome: 'answered' | 'chosen' | 'edited' | 'rejected';
  result: 'none' | 'one' | 'several' | null;
  aliasSource: 'personal' | 'global' | 'curated' | null;
  candidateIds: readonly string[];
  chosenId: string | null;
  createdAt: Date;
}

// An interpretation, the resolver's reading of the words: a Place, one state whatever the words that reached it, or
// the words left open by a question or a nothing, a state of their own, as the paper's failed interpretations carry
// the entity that failed. A question and a nothing differ for the metric, not for the chain: both have no success of
// their own, and both are left by a chip, an edit or a rephrase.
export type State = string;

export const SUCCESS = '+';
export const FAILURE = '-';
export type End = typeof SUCCESS | typeof FAILURE;

const PLACE = 'place:';

export const placeState = (placeId: string): State => `${PLACE}${placeId}`;
export const openState = (words: string): State => `open:${words}`;

// The Place id of a Place state, null for words left open.
export function placeOf(state: State): string | null {
  return state.startsWith(PLACE) ? state.slice(PLACE.length) : null;
}

const GAP_MS = SESSION_GAP_MINUTES * 60 * 1000;
const AGE_MS = ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;

function byTime(a: ChainRow, b: ChainRow): number {
  return a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);
}

// Whether the row ends at a Place: a Place answered, a chip or an edit.
function reachesPlace(row: ChainRow): boolean {
  return row.outcome === 'chosen' || row.outcome === 'edited' || (row.outcome === 'answered' && row.result === 'one');
}

// A session is cut at a gap over SESSION_GAP, after a rejection (the paper ends a session at an interjection), and
// where the User, having reached a Place, goes on to other words: a new request, not a rephrase, which the paper's 45
// seconds tell apart by time alone. An edit with no words goes with the Place it changes.
function cutBefore(row: ChainRow, last: ChainRow | undefined): boolean {
  if (last === undefined) {
    return false;
  }
  if (row.createdAt.getTime() - last.createdAt.getTime() > GAP_MS || last.outcome === 'rejected') {
    return true;
  }
  return reachesPlace(last) && row.words !== '' && row.words !== last.words;
}

// Whether the account was old enough at the session's first row for the session to teach.
function teaches(session: readonly ChainRow[]): boolean {
  const first = session[0];
  return (
    first !== undefined &&
    first.onboardedAt !== null &&
    first.createdAt.getTime() - first.onboardedAt.getTime() >= AGE_MS
  );
}

// One account's rows in time order, cut as cutBefore says, of the accounts old enough at the session's start.
export function sessionsOf(rows: readonly ChainRow[]): ChainRow[][] {
  const byUser = new Map<string, ChainRow[]>();
  for (const row of rows) {
    const own = byUser.get(row.userId);
    if (own === undefined) {
      byUser.set(row.userId, [row]);
    } else {
      own.push(row);
    }
  }
  const sessions: ChainRow[][] = [];
  for (const own of byUser.values()) {
    let current: ChainRow[] = [];
    for (const row of own.toSorted(byTime)) {
      if (cutBefore(row, current.at(-1))) {
        sessions.push(current);
        current = [];
      }
      current.push(row);
    }
    sessions.push(current);
  }
  return sessions.filter((session) => teaches(session));
}

// A visit of the walk: the state, and the words that led to it, by which the Places a successful session reaches after
// them are counted to the words' supporters. An edit with no words leads nowhere in particular.
export interface Visit {
  state: State;
  words: string | null;
}

export interface Walk {
  userId: string;
  visits: Visit[];
  end: End;
}

// The states an answered row visits: its reading, or, when a learned alias answered, the words left open and then
// the Place, as the paper's rewrite stands in for the question the User would have been asked. An alias in use so
// keeps the evidence that made it.
function answeredStates({ words, result, aliasSource, candidateIds }: ChainRow): State[] {
  const [first] = candidateIds;
  if (result !== 'one' || first === undefined) {
    return [openState(words)];
  }
  const learned = aliasSource === 'personal' || aliasSource === 'global';
  return learned && words !== '' ? [openState(words), placeState(first)] : [placeState(first)];
}

// The state a label leaves, which it implies when the row before is another: a chip answers its words left open, an
// edit leaves the Place it replaced, a rejection leaves the Place rejected. Null for a label that leaves nothing known.
function leftBy(row: ChainRow): State | null {
  if (row.outcome === 'chosen') {
    return row.words === '' ? null : openState(row.words);
  }
  const [replaced] = row.candidateIds;
  if (row.outcome === 'edited') {
    return replaced === undefined ? null : placeState(replaced);
  }
  return row.chosenId === null ? null : placeState(row.chosenId);
}

function visitLabel(visits: Visit[], row: ChainRow, words: string | null): End | null {
  const left = leftBy(row);
  if (left === null || row.chosenId === null) {
    return null;
  }
  if (visits.at(-1)?.state !== left) {
    visits.push({ state: left, words });
  }
  if (row.outcome === 'rejected') {
    return FAILURE;
  }
  visits.push({ state: placeState(row.chosenId), words });
  return null;
}

// The walk of a session through the states, ended by success after a Place (the paper's "absence of failure") and by
// failure after words left open (the User left with no Place, the paper's implicit failure) or a rejection (its
// explicit one). Two answered rows in a row are the User rephrasing. Null when no row of the session makes a state.
export function walkOf(session: readonly ChainRow[]): Walk | null {
  const visits: Visit[] = [];
  let end: End | null = null;
  for (const row of session) {
    const words = row.words === '' ? null : row.words;
    if (row.outcome === 'answered') {
      visits.push(...answeredStates(row).map((state): Visit => ({ state, words })));
    } else {
      end = visitLabel(visits, row, words);
      if (end !== null) {
        break;
      }
    }
  }
  const last = visits.at(-1);
  if (last === undefined) {
    return null;
  }
  const userId = session[0]?.userId ?? '';
  return { userId, visits, end: end ?? (placeOf(last.state) === null ? FAILURE : SUCCESS) };
}

// Accounts by words and Place.
export type Accounts = Map<string, Map<string, Set<string>>>;

export function addAccount(accounts: Accounts, words: string, placeId: string, userId: string): void {
  const places = accounts.get(words) ?? new Map<string, Set<string>>();
  const own = places.get(placeId) ?? new Set<string>();
  own.add(userId);
  places.set(placeId, own);
  accounts.set(words, places);
}

export function accountsOf(accounts: Accounts, words: string, placeId: string): number {
  return accounts.get(words)?.get(placeId)?.size ?? 0;
}

// The transition counts of the walks, c(h, v) by the state left and the state or end entered (the paper's Eq. 6–7),
// self-loops included, and per words the accounts whose successful session reached each Place at or after them.
export interface Transitions {
  counts: Map<State, Map<State, number>>;
  supporters: Accounts;
}

function count(counts: Transitions['counts'], from: State, to: State): void {
  const row = counts.get(from) ?? new Map<State, number>();
  row.set(to, (row.get(to) ?? 0) + 1);
  counts.set(from, row);
}

export function transitionsOf(walks: readonly Walk[]): Transitions {
  const counts = new Map<State, Map<State, number>>();
  const supporters: Accounts = new Map();
  for (const { userId, visits, end } of walks) {
    for (const [index, visit] of visits.entries()) {
      count(counts, visit.state, visits[index + 1]?.state ?? end);
      if (visit.words === null || end !== SUCCESS) {
        continue;
      }
      for (const later of visits.slice(index)) {
        const placeId = placeOf(later.state);
        if (placeId !== null) {
          addAccount(supporters, visit.words, placeId, userId);
        }
      }
    }
  }
  return { counts, supporters };
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AliasSource } from '../../places/place-aliases.js';
import { type MatchTier } from '../../places/place-index.js';
import { type ChoiceKind, type NoneFound, noneFound, type ToolContext } from '../feature.js';
import { type ProposalPlace } from '../proposal.js';

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

// A resolver's answer with what goes with it: the words as the model passed them, each candidate's plain name or
// title by id, and for Places the matcher's tier.
export interface Settled<Candidate> {
  kind: ChoiceKind;
  words: string;
  answer: Resolved<Candidate>;
  labels: ReadonlyMap<string, string>;
  tier?: MatchTier | null;
  aliasSource?: AliasSource | null;
}

// What a resolver does with its answer before the model reads it: the ids go to FoundIds, so that proposeQuest takes
// them; the candidates of a 'several' answer become the reply's choices, each kind and id once; and the answer is
// recorded as a resolution event.
export async function settle<Candidate extends { id: string }>(
  { found, presented, resolutions }: ToolContext,
  { kind, words, answer, labels, tier = null, aliasSource = null }: Settled<Candidate>,
): Promise<void> {
  const ids = givenIds(answer);
  found.add(kind, ids);
  if (answer.result === 'several') {
    for (const id of ids) {
      if (!presented.choices.some((choice) => choice.kind === kind && choice.id === id)) {
        presented.choices.push({ kind, id, label: labels.get(id) ?? '', words });
      }
    }
  }
  await resolutions.answered({ kind, words, result: answer.result, candidateIds: ids, tier, aliasSource });
}

// A Proposal whose Place is not the one of the Proposal sent back is the User correcting it, which is recorded as a
// label for the words last resolved to a Place.
export async function recordPlaceChange(
  { shown, resolutions }: ToolContext,
  place: ProposalPlace | null,
): Promise<void> {
  const before = shown?.place?.id;
  if (place !== null && before !== undefined && place.id !== before) {
    await resolutions.edited(before, place.id);
  }
}

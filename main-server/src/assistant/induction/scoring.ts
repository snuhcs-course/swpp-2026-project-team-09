/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type CompiledRule } from '../../places/induced-rules.js';
import { CuratedGroups } from '../../places/place-groups.js';
import { PlaceIndex } from '../../places/place-index.js';
import { type Instance } from './instances.js';

// How a rule set is scored (P07 ticket 07): the matcher with the curated groups and the rules, nothing anyone taught,
// answers each instance's words, and is right when it answers the one Place meant. This is the replay as GEPA's
// feedback function (research note 11 §3.1): free, so that the budget is counted in reflector calls.

export interface Answer {
  result: 'none' | 'one' | 'several';
  candidateIds: string[];
}

export interface Verdict {
  correct: boolean;
  answer: Answer;
}

export function indexOf(places: readonly PlaceDto[], rules: readonly CompiledRule[]): PlaceIndex {
  return new PlaceIndex(places, [new CuratedGroups(places)], { rules, holdbackPercent: 0 });
}

export function verdictsOf(index: PlaceIndex, instances: readonly Instance[]): Promise<Verdict[]> {
  return Promise.all(
    instances.map(async ({ words, placeId }) => {
      const { places } = await index.match(words, '');
      const candidateIds = places.map(({ id }) => id);
      let result: Answer['result'] = 'several';
      if (candidateIds.length === 0) {
        result = 'none';
      } else if (candidateIds.length === 1) {
        result = 'one';
      }
      return { correct: result === 'one' && candidateIds[0] === placeId, answer: { result, candidateIds } };
    }),
  );
}

export function correctCount(verdicts: readonly Verdict[]): number {
  return verdicts.filter(({ correct }) => correct).length;
}

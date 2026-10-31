/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../../src/places/dto/place.dto.js';
import { type AliasSource, type PlaceAliases } from '../../src/places/place-aliases.js';
import { CuratedGroups } from '../../src/places/place-groups.js';
import { PlaceIndex } from '../../src/places/place-index.js';
import { byNumber } from '../../src/places/places.service.js';

// The stages the replay compares (research note 08 §5, P07 ticket 06): A, the substring and number match resolvePlace
// used before P07; B, the tiered matcher with the curated groups only; C, B with the personal aliases and everyone's
// by ticket 03's count; D, B with the personal aliases and everyone's by the alias chain the server learns by.

export type Result = 'none' | 'one' | 'several';

export interface StageAnswer {
  result: Result;
  // Every Place id found, in the order the resolver gives them.
  candidates: string[];
  // The matcher's tier, `substring` for stage A, null for none.
  tier: string | null;
  // Whose alias answered, on the alias tier.
  source: AliasSource | null;
}

export type Stage = (words: string, userId: string) => Promise<StageAnswer>;

export type StageName = 'A' | 'B' | 'C' | 'D';

function answerOf(candidates: string[], tier: string | null, source: AliasSource | null): StageAnswer {
  if (candidates.length === 0) {
    return { result: 'none', candidates, tier: null, source: null };
  }
  return { result: candidates.length === 1 ? 'one' : 'several', candidates, tier, source };
}

// PlacesService.search as a function of the catalog: the names holding the text, ignoring case, and the Place whose
// number is the text without a trailing 동, in the order of the list.
export function substringMatch(places: readonly PlaceDto[], text: string): PlaceDto[] {
  const part = text.toLowerCase();
  const number = text.replace(/동$/u, '');
  return places
    .toSorted(byNumber)
    .filter((place) => place.name.toLowerCase().includes(part) || place.number === number);
}

export function stageA(places: readonly PlaceDto[]): Stage {
  return (words) =>
    Promise.resolve(
      answerOf(
        substringMatch(places, words).map(({ id }) => id),
        'substring',
        null,
      ),
    );
}

function matcherStage(index: PlaceIndex): Stage {
  return async (words, userId) => {
    const { tier, source, places } = await index.match(words, userId);
    return answerOf(
      places.map(({ id }) => id),
      tier,
      source,
    );
  };
}

export function stageB(places: readonly PlaceDto[]): Stage {
  return matcherStage(new PlaceIndex(places, [new CuratedGroups(places)]));
}

// Stage C or D: the learned sources in the order PlaceMatcher asks them, the User's own, then everyone's by the count
// or by the chain, then the curated groups.
export function withAliases(
  places: readonly PlaceDto[],
  learned: { personal: PlaceAliases; global: PlaceAliases },
): Stage {
  return matcherStage(new PlaceIndex(places, [learned.personal, learned.global, new CuratedGroups(places)]));
}

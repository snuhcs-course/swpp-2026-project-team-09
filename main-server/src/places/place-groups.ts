/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from './dto/place.dto.js';
import { type AliasHit, type PlaceAliases } from './place-aliases.js';

// Names for groups of buildings, which no rule can make from single catalog rows (research note 08 §5): 공대 is not one
// Place but several, and the matcher rightly answers `several` for it. Each entry names its buildings by number, the
// one thing about a Place that stays the same in every database.

interface PlaceGroup {
  // The words students say, each as the matcher normalises a query: no spaces.
  words: string[];
  numbers: string[];
}

// Unverified data: which buildings each group names has not been confirmed with students. Confirm every list with
// them before these entries count in any metric.
export const PLACE_GROUPS: readonly PlaceGroup[] = [
  {
    words: ['공대', '공과대학'],
    numbers: [
      '30',
      '31',
      '32',
      '33',
      '34',
      '35',
      '36',
      '37',
      '38',
      '39',
      '43',
      '43-1',
      '43-2',
      '44-1',
      '301',
      '302',
      '303',
    ],
  },
  { words: ['윗공대', '윗공'], numbers: ['301', '302', '303'] },
  { words: ['아랫공대', '아랫공'], numbers: ['30', '31', '32', '33', '34', '35', '36', '37', '38', '39'] },
  {
    words: ['자연대', '자연과학대학'],
    numbers: ['18', '19', '22', '23', '24', '25', '25-1', '26', '27', '28', '56', '56-1'],
  },
  { words: ['인문대', '인문대학'], numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '14'] },
  { words: ['사회대', '사회과학대학'], numbers: ['16', '16-1'] },
  { words: ['사범대', '사범대학'], numbers: ['9', '10', '10-1', '11', '12', '13'] },
  { words: ['농생대', '농업생명과학대학'], numbers: ['200', '201', '203'] },
];

// The curated groups as an alias source: each word resolved to the ids of the catalog's Places with those numbers. A
// number the catalog lacks is dropped, so no hit names a Place that is not there.
export class CuratedGroups implements PlaceAliases {
  private readonly hitsByWord = new Map<string, AliasHit[]>();

  constructor(places: readonly PlaceDto[], groups: readonly PlaceGroup[] = PLACE_GROUPS) {
    const idsByNumber = new Map<string, string[]>();
    for (const { id, number } of places) {
      if (number !== null) {
        idsByNumber.set(number, [...(idsByNumber.get(number) ?? []), id]);
      }
    }
    for (const { words, numbers } of groups) {
      const hits = numbers
        .flatMap((number) => idsByNumber.get(number) ?? [])
        .map((placeId): AliasHit => ({ placeId, source: 'curated' }));
      for (const word of words) {
        this.hitsByWord.set(word.toLowerCase(), hits);
      }
    }
  }

  lookup(query: string): Promise<AliasHit[]> {
    return Promise.resolve(this.hitsByWord.get(query) ?? []);
  }
}

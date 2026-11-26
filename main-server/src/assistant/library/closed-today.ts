/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type PlaceLookup } from '../../places/place-lookup.js';
import { type Lookup } from '../dto/lookup.dto.js';
import { type ToolContext } from '../feature.js';
import { closedTodayRefusal } from './booking-rules.js';
import { KWANJEONG_PLACE_NUMBER, type LibrarySpace } from './catalogue.js';

// A 관정도서관 space asked for after its closing today (P05 ticket 57): refused, with no card, and 관정 drawn on the
// map as a place with why, as a Restaurant with no menu is (P04 ticket 59): a grey mark, "관정도서관 · 오늘 23:00 닫음 ·
// 내일 07:00부터", its hours the catalogue's. It only tells a fact: no main button.

const LIBRARY = '관정도서관';

export interface ClosedWords {
  closedAt: string;
  opens: string;
}

export const closedWords = ({ hours }: LibrarySpace): ClosedWords => ({
  closedAt: hours?.close ?? '',
  opens: `내일 ${hours?.open ?? ''}`,
});

export function closedLookup(place: Pick<PlaceDto, 'id' | 'latitude' | 'longitude'>, words: ClosedWords): Lookup {
  const point = { placeId: place.id, label: LIBRARY, latitude: place.latitude, longitude: place.longitude };
  return {
    kind: 'place',
    chips: [],
    lines: [],
    basis: [],
    scene: {
      people: [],
      places: [{ place: point, role: 'dropped', tag: `${LIBRARY} · 오늘 ${words.closedAt} 닫음 · ${words.opens}부터` }],
      routes: [],
      flags: [],
    },
    band: null,
    actions: [],
    fact: true,
  };
}

// The refusal of a space closed for the rest of today, with when it opens next, and its place drawn; null while open.
export function closedToday(
  space: LibrarySpace,
  date: string,
  { now, presented }: Pick<ToolContext, 'now' | 'presented'>,
  places: Pick<PlaceLookup, 'numbered'>,
): object | null {
  const refusal = closedTodayRefusal(space, date, now);
  if (refusal === null) {
    return null;
  }
  const words = closedWords(space);
  const place = places.numbered(KWANJEONG_PLACE_NUMBER);
  if (place !== null) {
    presented.lookup = closedLookup(place, words);
    presented.answer = null;
  }
  return { result: 'refused', refusals: [refusal], closedToday: words };
}

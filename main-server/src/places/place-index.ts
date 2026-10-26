/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { disassemble } from 'es-hangul';
import { abbreviations, choseongOf, isChoseongOnly, isMixedChoseong, syllablesOf } from './abbreviations.js';
import { type PlaceDto } from './dto/place.dto.js';
import { type AliasSource, type PlaceAliases } from './place-aliases.js';
import { byNumber } from './places.service.js';

// Which Places a User's words name (P07 ticket 01, research note 08 §3), for the Assistant's resolvePlace. The tiers
// are tried in order and the first with hits answers; they never mix, so one generated hit (관정 → 관정관) is not
// outvoted by loose subsequence hits. Within a tier the Places whose name skips fewest syllables come first, then the
// order of the list. Several hits stay several: the matcher never guesses.
export type MatchTier = 'exact' | 'alias' | 'generated' | 'subsequence' | 'distance';

export interface PlaceMatch {
  // Null when nothing matched.
  tier: MatchTier | null;
  // Only on the alias tier.
  source: AliasSource | null;
  places: PlaceDto[];
}

const NONE: PlaceMatch = { tier: null, source: null, places: [] };

const SYLLABLES_ONLY = /^[가-힣]+$/u;
const SPACES = /\s+/gu;

interface Form {
  place: PlaceDto;
  text: string;
  choseong: string;
  // How many syllables of the name the form leaves out.
  skipped: number;
}

function key(text: string): string {
  return text.normalize('NFC').replaceAll(SPACES, '').toLowerCase();
}

function push<Value>(map: Map<string, Value[]>, at: string, value: Value): void {
  map.set(at, [...(map.get(at) ?? []), value]);
}

// Whether `query`, syllable by syllable, is `text` with some syllables left out, the first kept.
function anchoredSubsequence(query: string[], text: string[]): boolean {
  if (query[0] !== text[0]) {
    return false;
  }
  let at = 0;
  for (const syllable of text) {
    if (syllable === query[at]) {
      at += 1;
    }
  }
  return at === query.length;
}

// Whether two jamo strings are the same up to one edit: 학곤 against 학관.
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) {
    return false;
  }
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) {
      return false;
    }
    if (a.length > b.length) {
      i += 1;
    } else if (a.length < b.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// Whether a mixed query (ㅎ관) matches a form position by position: a consonant stands for any syllable with that
// 초성, and a syllable for itself.
function matchesMixed(query: string[], form: Form): boolean {
  const text = syllablesOf(form.text);
  const choseong = syllablesOf(form.choseong);
  return (
    text.length === query.length &&
    query.every((character, index) => character === text[index] || character === choseong[index])
  );
}

// The catalog indexed for matching: the exact names and numbers, every form of every name with its 초성, and the
// alias sources of tier 2 in the order they are asked.
export class PlaceIndex {
  private readonly byName = new Map<string, PlaceDto[]>();
  private readonly byNumber = new Map<string, PlaceDto[]>();
  private readonly byId = new Map<string, PlaceDto>();
  private readonly forms: Form[] = [];
  private readonly byForm = new Map<string, Form[]>();
  private readonly byChoseong = new Map<string, Form[]>();

  constructor(
    places: readonly PlaceDto[],
    private readonly aliases: readonly PlaceAliases[],
  ) {
    for (const place of places.toSorted(byNumber)) {
      this.byId.set(place.id, place);
      push(this.byName, key(place.name), place);
      if (place.number !== null) {
        push(this.byNumber, place.number, place);
      }
      const own = key(place.name);
      const length = syllablesOf(own).length;
      for (const text of [own, ...abbreviations(place.name).map((form) => key(form))]) {
        const form: Form = { place, text, choseong: choseongOf(text), skipped: length - syllablesOf(text).length };
        this.forms.push(form);
        push(this.byForm, text, form);
        push(this.byChoseong, form.choseong, form);
      }
    }
  }

  // The forms of a Place, for tests and measurements.
  formsOf(placeId: string): string[] {
    return this.forms
      .filter(({ place, text }) => place.id === placeId && key(place.name) !== text)
      .map(({ text }) => text);
  }

  match(words: string, userId: string): PlaceMatch {
    const query = key(words);
    if (query === '') {
      return NONE;
    }
    const exact = [...(this.byName.get(query) ?? []), ...(this.byNumber.get(query.replace(/동$/u, '')) ?? [])];
    if (exact.length > 0) {
      return { tier: 'exact', source: null, places: unique(exact).toSorted(byNumber) };
    }
    for (const source of this.aliases) {
      const hits = source.lookup(query, userId);
      const places = hits.map(({ placeId }) => this.byId.get(placeId)).filter((place) => place !== undefined);
      if (places.length > 0) {
        return { tier: 'alias', source: hits[0]?.source ?? null, places: unique(places).toSorted(byNumber) };
      }
    }
    const generated = this.generated(query);
    if (generated.length > 0) {
      return { tier: 'generated', source: null, places: ranked(generated) };
    }
    if (!SYLLABLES_ONLY.test(query) || syllablesOf(query).length < 2) {
      return NONE;
    }
    const syllables = syllablesOf(query);
    const subsequence = this.forms.filter(
      ({ skipped, text }) => skipped === 0 && anchoredSubsequence(syllables, syllablesOf(text)),
    );
    if (subsequence.length > 0) {
      return { tier: 'subsequence', source: null, places: ranked(subsequence) };
    }
    const jamo = disassemble(query);
    const close = this.forms.filter(
      ({ text }) => syllablesOf(text).length === syllables.length && withinOneEdit(jamo, disassemble(text)),
    );
    return close.length > 0 ? { tier: 'distance', source: null, places: ranked(close) } : NONE;
  }

  // Tier 3: a generated form as written, its 초성 when the query is all consonants, or a mixed form position by position.
  private generated(query: string): Form[] {
    if (isChoseongOnly(query)) {
      return this.byChoseong.get(query) ?? [];
    }
    if (isMixedChoseong(query)) {
      const characters = syllablesOf(query);
      return this.forms.filter((form) => matchesMixed(characters, form));
    }
    return this.byForm.get(query) ?? [];
  }
}

function unique(places: readonly PlaceDto[]): PlaceDto[] {
  return [...new Map(places.map((place) => [place.id, place])).values()];
}

// Each Place once, the one whose name skips fewest syllables first, then by the list's order.
function ranked(forms: readonly Form[]): PlaceDto[] {
  const least = new Map<string, Form>();
  for (const form of forms) {
    const known = least.get(form.place.id);
    if (known === undefined || form.skipped < known.skipped) {
      least.set(form.place.id, form);
    }
  }
  return [...least.values()]
    .toSorted((a, b) => a.skipped - b.skipped || byNumber(a.place, b.place))
    .map(({ place }) => place);
}

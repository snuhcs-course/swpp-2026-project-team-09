/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { PlaceDto } from '../places/dto/place.dto.js';

// A wrong position is published to every User, while a Draft only waits for an Administrator. So a place names a Place
// only when all that it writes is that Place, and anything the rules cannot account for makes a Draft.

// A number as a place writes it: "302동 105호", "학생회관(63동)", "71-1동", but not the address "역삼1동".
const NUMBER = /(?<![\p{L}\p{N}-])(\d+(?:-\d+)?)동/gu;

// What the list of Places, Gwanak's, cannot hold: the university's other campuses, hospitals and schools, the stations
// near it, another university, another district or region, and a flat, whose buildings have numbers too.
const ELSEWHERE = new RegExp(
  [
    String.raw`연건|시흥|평창|수원|보라매|대학로|혜화|서울대\s*입구|낙성대`,
    String.raw`(?<!수)의과대학|간호대학|치과병원|서울대(?:학교)?\s*병원|SNUH|의학연구원|의학도서관`,
    '부설|사대부',
    '(?<!서울)대학교',
    String.raw`서울(?:특별시|시)?\s+(?!관악구)[가-힣]{1,3}구(?![가-힣])`,
    '경기도|인천|부산|대구|대전|울산|세종시|제주|강원도|충청|전라|경상',
    '아파트',
  ].join('|'),
  'iu',
);

// The campus a Source's places are on unless they say otherwise.
export type CampusDefault = 'gwanak' | null;

// Names of Places that other institutions use for their own facilities, from the list of Places and the place lines of
// the development posts of eval/collection. Where the campus is only assumed, such a name has to be all a part writes,
// with a floor or a room at most: "OO구민체육센터 2층 체육관" is not 71동.
const GENERIC_PLACE_NAMES = new Set([
  '체육관',
  '미술관',
  '박물관',
  '학생회관',
  '교수회관',
  '행정관',
  '복지관',
  '학군단',
  '언어교육원',
  '종합운동장',
  '야구장',
  '테니스장',
  '게스트하우스',
  '컨벤션센타',
  '주차건물',
  '행정대학원',
  '환경대학원',
  '국제대학원',
  '보건대학원',
  '수의과대학',
  '생활과학대학',
  '농업생명과학대학',
  'SK텔레콤',
]);

// A room as a place writes it beside a building's name.
const ROOM_NAME = /(?:대|소)?강당|강의실|세미나실|회의실|로비/gu;

// A street address. The campus's own is 관악로 1.
const STREET = /([가-힣\d]+)(?:로|길)\s*\d+/gu;

// Neither a name nor a number alone shows that the place is on this campus: another university has its 체육관 too,
// and a government complex its 1동. The place has to say so, or write a Place's name and number together.
const ON_CAMPUS = /서울대|관악캠퍼스|SNU|Seoul National University/iu;

// "서울대학교미술관" is 서울대학교 and 미술관.
const GLUED_CAMPUS = /(?<![\p{L}\p{N}])(서울대학교|서울대(?!학교)|관악캠퍼스)(?=\p{L})/gu;

const LINK = /https?:\/\/\S+/gu;

// Where a place lists several, or writes a route between them.
const SEPARATOR = /[,，、/&·ㆍ;→⇒]|->|및|또는/gu;

// A part that names nowhere to go: online, or only a room or a floor once the campus is taken out.
const ONLINE = /zoom|줌|온라인|비대면|화상|webex|웨벡스|유튜브|youtube|teams|google meet|생중계|하이브리드/iu;
const CAMPUS = /서울대학교|서울대|관악캠퍼스|SNU/giu;
const ROOM_ONLY = /^(?:[\s\d().:~※[\]-]|호|층|지하|[fb])*$/iu;

interface Span {
  start: number;
  end: number;
}

// Places a name of the place names, where the place writes it.
interface NameMention extends Span {
  places: PlaceDto[];
  generic: boolean;
}

function escaped(text: string): string {
  return text.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`);
}

// The name as a whole word, with or without its own spaces or a "·" between its words, and whatever the case of its
// Latin letters: 국립중앙박물관 does not hold 박물관.
function wordPattern(name: string): RegExp {
  const words = name
    .trim()
    .split(/\s+/u)
    .map((word) => escaped(word));
  return new RegExp(String.raw`(?<![\p{L}\p{N}])${words.join(String.raw`[\s·ㆍ]*`)}(?![\p{L}\p{N}])`, 'giu');
}

function baseNumber(number: string): string {
  return number.split('-')[0];
}

export function isElsewhere(text: string): boolean {
  return ELSEWHERE.test(text) || [...text.matchAll(STREET)].some(([, street]) => street !== '관악');
}

// The Place, and the Places whose name is its name with a number: 국제대학원 is 140동, and 국제대학원2 140-1동.
function seriesOf(place: PlaceDto, places: PlaceDto[]): PlaceDto[] {
  const series = new RegExp(String.raw`^${escaped(place.name)}\s*\d+$`, 'u');
  return [place, ...places.filter(({ name }) => series.test(name))];
}

// Each name of a Place the text holds. A name inside a longer one there does not count, so that 유전공학연구소 신관 is
// not also 유전공학연구소. A name without a letter, such as OpenStreetMap's 901, would be found in a room number.
function nameMentions(text: string, places: PlaceDto[]): NameMention[] {
  const found = places
    .filter(({ name }) => /\p{L}/u.test(name))
    .flatMap((place) =>
      [...text.matchAll(wordPattern(place.name))].map(({ index, 0: name }) => ({
        start: index,
        end: index + name.length,
        place,
      })),
    );
  const kept = found.filter(
    (one) =>
      !found.some(
        (other) => other.start <= one.start && other.end >= one.end && other.end - other.start > one.end - one.start,
      ),
  );
  const bySpan = new Map<string, NameMention>();
  for (const { start, end, place } of kept) {
    const mention = bySpan.get(`${start}:${end}`) ?? { start, end, places: [], generic: false };
    mention.places.push(...seriesOf(place, places));
    mention.generic ||= GENERIC_PLACE_NAMES.has(place.name);
    bySpan.set(`${start}:${end}`, mention);
  }
  return [...bySpan.values()];
}

// The text cut where it lists several, but not inside a name: 데이터사이언스대학원 및 공과대학 강의동 1 is one Place.
function parts(text: string, names: Span[]): Span[] {
  const cuts = [...text.matchAll(SEPARATOR)].filter(
    ({ index }) => !names.some(({ start, end }) => start <= index && index < end),
  );
  const spans: Span[] = [];
  let start = 0;
  for (const { index, 0: separator } of cuts) {
    spans.push({ start, end: index });
    start = index + separator.length;
  }
  spans.push({ start, end: text.length });
  return spans;
}

// What a part writes once its campus, a name of it, its floors and its rooms are taken out.
function restOf(part: Span, name: Span, text: string): string {
  const before = text.slice(part.start, name.start);
  const after = text.slice(name.end, part.end);
  return `${before} ${after}`.replaceAll(CAMPUS, '').replaceAll(ROOM_NAME, '');
}

// Where the campus is assumed, a generic name says nothing more than the campus does unless it is all the part writes.
function standsAlone(part: Span, names: NameMention[], text: string, assumed: boolean): boolean {
  return !assumed || names.every((name) => !name.generic || ROOM_ONLY.test(restOf(part, name, text)));
}

// The Places a part names, none when it names nowhere to go, or null when it names one the list does not hold, two that
// disagree, or one that nothing shows is on this campus. A number decides; a name beside it has to agree, by the number
// before the hyphen of one of the Places it names.
function partPlaces(
  part: string,
  numbers: string[],
  names: NameMention[],
  places: PlaceDto[],
  onCampus: boolean,
): PlaceDto[] | null {
  if (numbers.length > 0) {
    const numbered = places.filter(({ number }) => number !== null && numbers.includes(number));
    const bases = new Set(numbers.map((number) => baseNumber(number)));
    const agrees = ({ number }: PlaceDto): boolean => number !== null && bases.has(baseNumber(number));
    const allHeld = numbers.every((wanted) => numbered.some(({ number }) => number === wanted));
    const nameAgrees = names.every((name) => name.places.some((entry) => agrees(entry)));
    return allHeld && nameAgrees && (onCampus || names.length > 0) ? numbered : null;
  }
  if (names.length > 0) {
    return onCampus ? names.flatMap((name) => name.places) : null;
  }
  const rest = part.replaceAll(CAMPUS, '');
  return ONLINE.test(rest) || ROOM_ONLY.test(rest) ? [] : null;
}

// The one Place a place names. With a campus default, a place that names nowhere else is read as on that campus.
export function namedPlace(
  placeText: string | null,
  places: PlaceDto[],
  campusDefault: CampusDefault = null,
): PlaceDto | null {
  if (placeText === null) {
    return null;
  }
  const text = placeText.replaceAll('\u00A0', ' ').replaceAll(LINK, ' ').replaceAll(GLUED_CAMPUS, '$1 ');
  if (isElsewhere(text)) {
    return null;
  }
  const names = nameMentions(text, places);
  const numbers = [...text.matchAll(NUMBER)].map(({ index, 1: number }) => ({ start: index, number }));
  const written = ON_CAMPUS.test(text);
  const assumed = !written && campusDefault === 'gwanak';
  const named = new Map<string, PlaceDto>();
  for (const part of parts(text, names)) {
    const within = ({ start: at }: { start: number }): boolean => part.start <= at && at < part.end;
    const partNumbers = numbers.filter((mention) => within(mention)).map(({ number }) => number);
    const partNames = names.filter((mention) => within(mention));
    const found =
      partNumbers.length > 0 || standsAlone(part, partNames, text, assumed)
        ? partPlaces(text.slice(part.start, part.end), partNumbers, partNames, places, written || assumed)
        : null;
    if (found === null) {
      return null;
    }
    for (const entry of found) {
      named.set(entry.id, entry);
    }
  }
  return named.size === 1 ? [...named.values()][0] : null;
}

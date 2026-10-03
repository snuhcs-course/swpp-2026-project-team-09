import { PlaceDto } from '../places/dto/place.dto.js';

// A building number as a place writes it: "302동 105호", "학생회관(63동)", "71-1동", but not the address "역삼1동".
const NUMBER = /(?<![\p{L}\p{N}-])(\d+(?:-\d+)?)동/gu;

// The university's other campuses. The list of Places is Gwanak's, so a place there names none of it.
const OTHER_CAMPUS = /연건|시흥|평창|수원/u;

function withoutSpaces(text: string): string {
  return text.replaceAll(/\s/gu, '');
}

// The name as a whole word, with or without its own spaces and whatever the case of its Latin letters: 국립중앙박물관
// does not hold 박물관.
function wordPattern(name: string): RegExp {
  const words = name
    .trim()
    .split(/\s+/u)
    .map((word) => word.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`));
  return new RegExp(String.raw`(?<![\p{L}\p{N}])${words.join(String.raw`\s*`)}(?![\p{L}\p{N}])`, 'iu');
}

// The Places whose name the place holds. A name inside a longer one the place also holds does not count, so that
// 유전공학연구소 신관 is not also 유전공학연구소. A name without a letter, such as OpenStreetMap's 901, would be found in
// a room number.
function byName(place: string, places: PlaceDto[]): PlaceDto[] {
  const held = places
    .filter(({ name }) => /\p{L}/u.test(name) && wordPattern(name).test(place))
    .map((listed) => ({ listed, name: withoutSpaces(listed.name).toLowerCase() }));
  return held
    .filter(({ name }) => !held.some((other) => other.name.length > name.length && other.name.includes(name)))
    .map(({ listed }) => listed);
}

// The one Place of the list a place names, or null when it names none or several, or is on another campus. A place
// that writes a building number is matched by its numbers alone, since several Places can share a name.
export function namedPlace(place: string | null, places: PlaceDto[]): PlaceDto | null {
  if (place === null || OTHER_CAMPUS.test(place)) {
    return null;
  }
  const numbers = new Set([...place.matchAll(NUMBER)].map(([, number]) => number));
  const named =
    numbers.size > 0 ? places.filter(({ number }) => number !== null && numbers.has(number)) : byName(place, places);
  return named.length === 1 ? named[0] : null;
}

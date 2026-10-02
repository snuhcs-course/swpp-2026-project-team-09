import { BuildingDto } from '../buildings/dto/building.dto.js';

// A building number as a place writes it: "302동 105호", "학생회관(63동)", "71-1동".
const NUMBER = /(?<![\p{L}\p{N}-])(\d+(?:-\d+)?)동/gu;

// Spaces and the case of Latin letters do not count.
function comparable(text: string): string {
  return text.replaceAll(/\s/gu, '').toLowerCase();
}

// The entries whose name the place holds. A name inside a longer one the place also holds does not count, so that
// 자하연식당 is not also 자하연. A name without a letter, such as OpenStreetMap's 901, would be found in a room number.
function byName(place: string, buildings: BuildingDto[]): BuildingDto[] {
  const text = comparable(place);
  const held = buildings
    .map((building) => ({ building, name: comparable(building.name) }))
    .filter(({ name }) => /\p{L}/u.test(name) && text.includes(name));
  return held
    .filter(({ name }) => !held.some((other) => other.name.length > name.length && other.name.includes(name)))
    .map(({ building }) => building);
}

// The one entry of the building list a place names, or null when it names none or several. A place that writes a
// building number is matched by its numbers alone, since several buildings can share a name.
export function buildingOfPlace(place: string | null, buildings: BuildingDto[]): BuildingDto | null {
  if (place === null) {
    return null;
  }
  const numbers = new Set([...place.matchAll(NUMBER)].map(([, number]) => number));
  const named =
    numbers.size > 0
      ? buildings.filter(({ number }) => number !== null && numbers.has(number))
      : byName(place, buildings);
  return named.length === 1 ? named[0] : null;
}

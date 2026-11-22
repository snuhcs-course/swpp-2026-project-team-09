/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Refusal } from './booking-rules.js';
import { type Catalogue, type LibrarySpace } from './catalogue.js';

// Whether the people of a 관정 booking can book its space: a seat is one person's, and a room holds its capacity and no
// more than a party.

// A booking party is a Quest, and a Quest holds 1–8 people (quests_capacity_check).
export const PARTY_MAX = 8;

export const PARTY_REFUSAL = '파티는 최대 8명까지라 9명 이상 방 예약은 아직 못 해요 — 직접 예약해 주세요';

// The group study room sizes on the same floor that hold this many people and that a party can hold. A media room's
// purpose is its own, so none is offered for another.
function largerSizes(catalogue: Catalogue, space: LibrarySpace, people: number): { id: string; name: string }[] {
  return catalogue.spaces
    .filter(
      (other) =>
        other.id !== space.id &&
        other.floor === space.floor &&
        other.kind === 'group-study-room' &&
        space.kind === 'group-study-room' &&
        other.implemented &&
        other.bookable &&
        other.capacity !== null &&
        other.capacity.min <= PARTY_MAX &&
        other.capacity.min <= people &&
        other.capacity.max >= people,
    )
    .map(({ id, name }) => ({ id, name }));
}

// GR_MIN and GR_MAX are compared as numbers: the site compares them as strings, by which "10" < "8".
export function peopleRefusal(catalogue: Catalogue, space: LibrarySpace, people: number): Refusal | null {
  if (space.unit === 'seat') {
    return people > 1
      ? { field: 'friendIds', reason: '열람실 좌석은 한 사람씩 예약해요. 함께 가는 분은 각자 예약해 주세요', bound: 1 }
      : null;
  }
  const { capacity } = space;
  if (capacity === null) {
    return null;
  }
  if (people > PARTY_MAX || capacity.min > PARTY_MAX) {
    return { field: 'friendIds', reason: PARTY_REFUSAL, bound: PARTY_MAX };
  }
  if (people < capacity.min) {
    const more = capacity.min - people;
    return {
      field: 'friendIds',
      reason: `${space.name}은 ${capacity.min}명 이상이어야 예약할 수 있어요. ${more}명 더 필요해요`,
      bound: { min: capacity.min, more },
    };
  }
  if (people > capacity.max) {
    const larger = largerSizes(catalogue, space, people);
    const offer =
      larger.length === 0 ? '' : `. ${people}명이면 ${larger.map(({ name }) => name).join(', ')}을 예약할 수 있어요`;
    return {
      field: 'friendIds',
      reason: `${space.name}은 최대 ${capacity.max}명까지예요${offer}`,
      bound: { max: capacity.max, larger },
    };
  }
  return null;
}

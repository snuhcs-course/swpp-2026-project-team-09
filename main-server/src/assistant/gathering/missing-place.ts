/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { closureNotices, servedLines } from '../../menus/open-rule.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type Lookup, type PlacePoint } from '../dto/answer.dto.js';
import { part } from '../lookup/way-naming.js';

// Why a Restaurant is not among the places of the meal answer on screen (P04 ticket 67), as the planner finds it for
// the same conditions: its menu not collected for the meal, closed for it by its menu's notice, dropped for the time
// with the reason the planner gave, or none of those, as it cannot be reached, eaten at, and left in time. A Restaurant
// that is one of the places says so.
export type MissingReason =
  | { why: 'no-menu' }
  | { why: 'closed'; notices: string[] }
  | { why: 'time'; reason: string }
  | { why: 'no-fit' }
  | { why: 'listed' };

// What the Restaurant's lines for the meal tell alone: not collected (none, or nothing but notes), or closed by its
// notice; null when it serves the meal, and the planner's answer tells the rest.
export function cellReasonOf(cell: readonly MenuLineDto[]): MissingReason | null {
  const notices = closureNotices(cell);
  if (notices.length > 0) {
    return { why: 'closed', notices };
  }
  return servedLines(cell).length === 0 ? { why: 'no-menu' } : null;
}

// A plan or a place dropped, by its Place's label.
interface Named {
  place: Pick<PlacePoint, 'label'>;
}

// What the planner's answer for the conditions on screen tells of a Restaurant that serves the meal.
export function planReasonOf(
  key: string,
  { plans, dropped }: { plans: readonly Named[]; dropped: readonly (Named & { reason: string })[] },
): MissingReason {
  if (plans.some(({ place }) => place.label === key)) {
    return { why: 'listed' };
  }
  const drop = dropped.find(({ place }) => place.label === key);
  return drop === undefined ? { why: 'no-fit' } : { why: 'time', reason: drop.reason };
}

// The reason in the User's words, which the model says in one sentence and the Restaurant's label on the map shows.
const WORDS = {
  'no-menu': '메뉴가 올라오지 않았어요',
  'no-fit': '시간 안에 다녀올 수 없어요',
  listed: '목록에 있어요',
} as const;

export function missingWords(reason: MissingReason): string {
  if (reason.why === 'closed') {
    return reason.notices.join(' ');
  }
  return reason.why === 'time' ? reason.reason : WORDS[reason.why];
}

// The Restaurant brought to the map with its reason, as a menu's or hours' answer brings it: picked out, its label
// saying why, and the closure's words as the basis. Only a fact: the map lets it go under the next reply.
export function missingLookup(
  key: string,
  reason: MissingReason,
  place: Pick<PlaceDto, 'id' | 'latitude' | 'longitude'>,
): Lookup {
  const at = { latitude: place.latitude, longitude: place.longitude };
  const words = missingWords(reason);
  const point = { placeId: place.id, label: key, ...at };
  return {
    kind: 'place',
    chips: [],
    lines: [[part(key, true)], [part(words)]],
    basis: [],
    scene: {
      people: [],
      places: [{ place: point, role: 'pick', tag: key }],
      routes: [],
      flags: [{ at, text: `${key} · ${words}`, role: 'place' }],
    },
    band: null,
    actions: [{ kind: 'guide', to: point }],
    fact: true,
  };
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type StudyBuildingDto, type StudySpaceDto } from '../../study-spaces/dto/study-spaces.dto.js';
import {
  type ConditionChip,
  type Lookup,
  type LookupAction,
  type MapScene,
  type PlacePoint,
} from '../dto/answer.dto.js';
import { clockOf, type DayItem } from '../free-time/free-time.js';
import { edgeTowards, inArea, longestStay, type StudyArea, studyDayOf, type StudyStay, stayAt } from './study-near.js';
import { type WayArgs, type WayStart } from './way.js';
import { GATE_BASIS } from './way-lookup.js';
import { dueWords, part, WayNaming } from './way-naming.js';

// The study spaces of the visible area drawn on the map ("이 근처 조용히 공부할 곳"): the one the User may use where
// they can stay longest before their next item, the rooms open only to others faded, and 관정 pointed to when it is
// outside the area. The model is given names and minutes, never the area.

export type StudyWhat = 'quiet' | 'group' | 'pc' | 'any';

// The chip of each kind asked, and the kinds of space it takes.
export const STUDY_WHATS: Record<StudyWhat, { words: string; kinds: readonly StudySpaceDto['kind'][] }> = {
  quiet: { words: '조용한 곳', kinds: ['library', 'reading'] },
  group: { words: '같이 공부할 곳', kinds: ['group'] },
  pc: { words: '컴퓨터 쓸 곳', kinds: ['pc'] },
  any: { words: '공부할 곳', kinds: ['library', 'reading', 'lounge', 'pc', 'group'] },
};

export interface StudyArgs {
  // The User's day, where they are, and the walking table; nothing in it names a Place to go to.
  way: WayArgs;
  // The 공부공간 layer as the User may use it.
  buildings: readonly StudyBuildingDto[];
  area: StudyArea | null;
  what: StudyWhat;
}

export interface RestrictedWords {
  building: string;
  space: string;
  openTo: string | null;
}

export interface StudyWords {
  building: string;
  space: string;
  hours: string | null;
  from: string;
  walkMinutes: number;
  next: string | null;
  leaveBy: string | null;
  stayMinutes: number | null;
  restricted: RestrictedWords[];
  kwanjeong: 'in the visible area' | 'outside the visible area';
}

export type StudyAnswer =
  | { result: 'found'; lookup: Lookup; words: StudyWords }
  | { result: 'none'; reason: 'no-area' | 'nothing-in-area' | 'no-start' }
  | { result: 'none'; reason: 'none-usable'; restricted: RestrictedWords[] };

interface Found {
  building: StudyBuildingDto;
  space: StudySpaceDto;
}

interface Picked extends Found {
  stay: StudyStay;
}

const ASK_KWANJEONG: LookupAction = { kind: 'ask', label: '관정 보기', text: '관정 지금 자리 있어?' };

// A building as the 공부공간 layer names it, with its Place's number, as a way names a Place gone to.
const labelOf = ({ name, place }: StudyBuildingDto): string =>
  place.number === null ? name : `${name}(${place.number}동)`;

const pointOf = (building: StudyBuildingDto): PlacePoint => {
  const { id, latitude, longitude } = building.place;
  return { placeId: id, label: labelOf(building), latitude, longitude };
};

// The hours as one line on the map: their first part ("학기 중 24시간" of "학기 중 24시간 · 방학 08:00–24:00").
const pickTag = ({ name, hours }: StudySpaceDto): string =>
  hours === null ? name : `${name} · ${hours.split(' · ')[0] ?? hours}`;

const restrictedWords = ({ building, space }: Found): RestrictedWords => ({
  building: building.name,
  space: space.name,
  openTo: space.restrictedTo,
});

// "걸어서 8분 · 12:52까지 34분"; without the walk in the building itself, and without the stay when nothing follows.
function stayWords({ walkMinutes, leaveBy, minutes }: StudyStay): string {
  const walk = walkMinutes > 0 ? [`걸어서 ${walkMinutes}분`] : [];
  if (leaveBy === null || minutes === null) {
    return walk.join('');
  }
  return [...walk, minutes > 0 ? `${clockOf(leaveBy)}까지 ${minutes}분` : '머물 시간이 없어요'].join(' · ');
}

const nextWords = (next: DayItem | null): string | null =>
  next === null ? null : dueWords({ at: next.start, isClass: next.isClass });

const chip = (kind: ConditionChip['kind'], text: string): ConditionChip => ({ kind, text, userId: null });

function chipsOf(from: string, next: DayItem | null, what: StudyWhat): ConditionChip[] {
  const until = nextWords(next);
  return [
    chip('origin', `${from}에서`),
    ...(until === null ? [] : [chip('until', `${until}까지`)]),
    chip('area', '보는 범위'),
    chip('what', STUDY_WHATS[what].words),
  ];
}

// 관정관, the building whose seats the phone reads, when it is outside the area: the area's edge towards it.
function awayFlag(area: StudyArea, buildings: readonly StudyBuildingDto[]): MapScene['flags'] {
  const kwanjeong = buildings.find(({ liveSeats }) => liveSeats !== null)?.place;
  if (kwanjeong === undefined || inArea(area, kwanjeong)) {
    return [];
  }
  const { at, arrow } = edgeTowards(area, kwanjeong);
  return [{ at, text: `${arrow} 관정`, role: 'away', placeId: kwanjeong.id }];
}

function sceneOf(
  way: WayArgs,
  { start, picked, restricted }: { start: WayStart; picked: Picked; restricted: readonly Found[] },
  away: MapScene['flags'],
): MapScene {
  const naming = new WayNaming(way);
  const point = pointOf(picked.building);
  const at = { latitude: point.latitude, longitude: point.longitude };
  const { walkMinutes } = picked.stay;
  const text = stayWords(picked.stay);
  return {
    people: [naming.me({ start })],
    places: [
      { place: point, role: 'pick', tag: pickTag(picked.space) },
      ...restricted.map(({ building, space }) => ({
        place: pointOf(building),
        role: 'dropped' as const,
        tag: space.restrictedTo === null ? space.name : `${space.name} · ${space.restrictedTo}`,
      })),
    ],
    routes:
      walkMinutes > 0
        ? [{ userId: way.me.userId, role: 'me', from: naming.position(start.placeId), to: at, minutes: walkMinutes }]
        : [],
    flags: [...(text === '' ? [] : [{ at, text, role: 'place' as const }]), ...away],
  };
}

// The spaces of the kind asked whose building's Place lies in the area.
function spacesIn(area: StudyArea, buildings: readonly StudyBuildingDto[], what: StudyWhat): Found[] {
  const { kinds } = STUDY_WHATS[what];
  return buildings
    .filter(({ place }) => inArea(area, place))
    .flatMap((building) =>
      building.spaces.flatMap((space) => (kinds.includes(space.kind) ? [{ building, space }] : [])),
    );
}

interface Drawn {
  from: string;
  next: DayItem | null;
  picked: Picked;
  restricted: readonly Found[];
  away: MapScene['flags'];
}

function wordsOf({ from, next, picked, restricted, away }: Drawn): StudyWords {
  const { leaveBy, minutes, walkMinutes } = picked.stay;
  return {
    building: picked.building.name,
    space: picked.space.name,
    hours: picked.space.hours,
    from,
    walkMinutes,
    next: nextWords(next),
    leaveBy: leaveBy === null ? null : clockOf(leaveBy),
    stayMinutes: minutes,
    restricted: restricted.map((each) => restrictedWords(each)),
    kwanjeong: away.length > 0 ? 'outside the visible area' : 'in the visible area',
  };
}

export function studyAnswer({ way, buildings, area, what }: StudyArgs): StudyAnswer {
  if (area === null) {
    return { result: 'none', reason: 'no-area' };
  }
  const found = spacesIn(area, buildings, what);
  const usable = found.filter(({ space }) => space.usable);
  const restricted = found.filter(({ space }) => !space.usable);
  if (found.length === 0) {
    return { result: 'none', reason: 'nothing-in-area' };
  }
  if (usable.length === 0) {
    return { result: 'none', reason: 'none-usable', restricted: restricted.map((each) => restrictedWords(each)) };
  }
  const { ready, start, next } = studyDayOf(way);
  if (start === null) {
    return { result: 'none', reason: 'no-start' };
  }
  const picked = longestStay(
    usable.map(({ building, space }) => ({
      building,
      space,
      stay: stayAt({ ready, start, next }, building.place.id, way.travel),
    })),
  );
  if (picked === null) {
    return { result: 'none', reason: 'nothing-in-area' };
  }
  const drawn = { from: new WayNaming(way).from({ start }), next, picked, restricted, away: awayFlag(area, buildings) };
  const lookup: Lookup = {
    kind: 'study',
    chips: chipsOf(drawn.from, next, what),
    lines: [[part('보는 범위에선 '), part(picked.building.name, true)], [part('빈 자리 수는 관정만 알 수 있어요')]],
    basis: [
      '지도에 보이는 범위 안의 공부공간만 찾았어요',
      ...(restricted.length > 0 ? ['학과 전용 열람실은 흐리게 두었어요'] : []),
      ...(start.basis === 'gate' ? [GATE_BASIS] : []),
    ],
    scene: sceneOf(way, { start, picked, restricted }, drawn.away),
    band: null,
    actions:
      picked.stay.walkMinutes > 0 ? [{ kind: 'guide', to: pointOf(picked.building) }, ASK_KWANJEONG] : [ASK_KWANJEONG],
  };
  return { result: 'found', lookup, words: wordsOf(drawn) };
}

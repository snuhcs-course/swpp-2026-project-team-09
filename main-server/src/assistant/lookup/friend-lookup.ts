/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type AnswerLine, type CardFact, type Lookup, type MapScene } from '../dto/answer.dto.js';
import { byStart, clockOf, type DayItem } from '../free-time/free-time.js';
import { itemBefore, withCopula, withSubject, withTopic } from '../gathering/answer-words.js';
import { minutesBetween, RECENT_CLASS_MINUTES } from '../gathering/gathering.js';
import { PlaceNaming } from '../gathering/place-naming.js';
import { othersText } from '../others-text.js';
import { cardOf, fact } from './card.js';
import { part } from './way-naming.js';

// Where a Friend is, drawn with what the asker's map shows of them and nothing more: their position at the exact level,
// the building they are in at the building level, and at the Timetable only, their Class's Place during the Class and
// for 15 minutes after it, else nothing but their Timetable's label.

export interface FriendArgs {
  now: Date;
  // As the Friend view gives them to the asker.
  friend: FriendView;
  // The Friend's Classes today.
  classes: readonly DayItem[];
  // The nearest Place within 150 m of an exact position no Place holds.
  nearPlaceId: string | null;
  placeOf: (placeId: string) => PlaceDto;
}

// What the model is given: what the map draws, and the Timetable's label when it draws nothing.
export interface FriendWords {
  name: string;
  shows: 'exact location' | 'the building they are in' | 'Timetable only';
  // The Place the map draws them at, or near.
  place: string | null;
  classUntil: string | null;
  // When the Class ended, while they are drawn at its Place after it.
  classEnded: string | null;
  timetable: string | null;
}

export interface FriendAnswer {
  lookup: Lookup;
  words: FriendWords;
}

const HIDDEN = '지금 위치는 보여 주지 않아요';

const currentOf = (classes: readonly DayItem[], now: Date): DayItem | null =>
  classes.find(({ start, end }) => start <= now && now < end) ?? null;

const nextOf = (classes: readonly DayItem[], now: Date): DayItem | undefined =>
  classes.filter(({ start }) => start > now).toSorted(byStart)[0];

// "수업 중 · 12:15까지", "공강 · 14:00까지", "첫 수업 13:00", "오늘 수업 끝", or "오늘 수업 없음"; a line that already
// holds a dot joins the state and its time with a space.
function timetableLabel(classes: readonly DayItem[], now: Date, joint = ' · '): string {
  const current = currentOf(classes, now);
  if (current !== null) {
    return `수업 중${joint}${clockOf(current.end)}까지`;
  }
  const next = nextOf(classes, now);
  if (next === undefined) {
    return classes.length === 0 ? '오늘 수업 없음' : '오늘 수업 끝';
  }
  return classes.some(({ end }) => end <= now)
    ? `공강${joint}${clockOf(next.start)}까지`
    : `첫 수업 ${clockOf(next.start)}`;
}

// The Class with a Place the Timetable puts them in now, or the one that ended at most 15 minutes ago.
function classAt(classes: readonly DayItem[], now: Date): { item: DayItem; placeId: string; ended: boolean } | null {
  const current = currentOf(classes, now);
  if (current !== null) {
    return current.placeId === null ? null : { item: current, placeId: current.placeId, ended: false };
  }
  const ended = itemBefore(classes, now);
  if (ended === null || ended.placeId === null || minutesBetween(ended.end, now) > RECENT_CLASS_MINUTES) {
    return null;
  }
  return { item: ended, placeId: ended.placeId, ended: true };
}

function sceneWith(
  friend: FriendView,
  at: Position,
  source: MapScene['people'][number]['source'],
  tag: string,
): MapScene {
  return {
    people: [{ userId: friend.id, name: friend.name, me: false, at, source, tag }],
    places: [],
    routes: [],
    flags: [],
  };
}

interface Drawn {
  lines: AnswerLine[];
  basis: string[];
  scene: MapScene;
  words: Omit<FriendWords, 'name'>;
}

// "민수는 지금 302동이에요", with "12:15까지 수업이에요" during a Class.
function shown(friend: FriendView, first: string, current: DayItem | null): AnswerLine[] {
  const particle = withTopic(friend.name).slice(friend.name.length);
  const lines: AnswerLine[] = [[part(friend.name, true), part(`${particle} ${first}`)]];
  return current === null ? lines : [...lines, [part(`${clockOf(current.end)}까지 수업이에요`)]];
}

function exactly(args: FriendArgs, at: Position, naming: PlaceNaming): Drawn {
  const { friend, classes, now, nearPlaceId } = args;
  const near = nearPlaceId === null ? null : `${naming.placeLabel(nearPlaceId)} 앞`;
  const place = friend.placeId === null ? near : naming.placeLabel(friend.placeId);
  const current = currentOf(classes, now);
  return {
    lines: shown(friend, place === null ? '지금 여기 있어요' : `지금 ${place}에 있어요`, current),
    basis: [`${withTopic(friend.name)} 내게 정확한 위치를 보여 줘요`],
    scene: sceneWith(friend, at, 'exact', place === null ? friend.name : `${friend.name} · ${place}`),
    words: {
      shows: 'exact location',
      place,
      classUntil: current === null ? null : clockOf(current.end),
      classEnded: null,
      timetable: null,
    },
  };
}

function atBuilding(args: FriendArgs, placeId: string, naming: PlaceNaming): Drawn {
  const { friend, classes, now } = args;
  const place = naming.placeLabel(placeId);
  const current = currentOf(classes, now);
  return {
    lines: shown(friend, `지금 ${withCopula(place)}`, current),
    basis: [`${withTopic(friend.name)} 내게 지금 있는 건물까지 보여 줘요`],
    scene: sceneWith(friend, naming.position(placeId), 'building', `${friend.name} · 지금 ${place}`),
    words: {
      shows: 'the building they are in',
      place,
      classUntil: current === null ? null : clockOf(current.end),
      classEnded: null,
      timetable: null,
    },
  };
}

function byTimetable({ friend, classes, now }: FriendArgs, naming: PlaceNaming): Drawn {
  const basis = [`${withTopic(friend.name)} 내게 시간표만 보여요`, `${friend.name}에게 묻거나 알리지 않아요`];
  const located = classAt(classes, now);
  if (located === null) {
    const label = timetableLabel(classes, now);
    return {
      lines: [[part(friend.name, true), part(` · ${label}`)]],
      basis,
      scene: { people: [], places: [], routes: [], flags: [] },
      words: { shows: 'Timetable only', place: null, classUntil: null, classEnded: null, timetable: label },
    };
  }
  const { item, placeId, ended } = located;
  const place = naming.placeLabel(placeId);
  const end = clockOf(item.end);
  const said = ended
    ? [part(`${end}에 ${place} 수업`, true), part('이 끝났어요')]
    : [part(`${end}까지 ${place} 수업`, true), part('이에요')];
  const tag = ended ? `${friend.name} · ${end} ${place} 수업 끝` : `${friend.name} · 수업 중 ${end}까지`;
  return {
    lines: [[part(`${withTopic(friend.name)} `), ...said], [part(HIDDEN)]],
    basis,
    scene: sceneWith(friend, naming.position(placeId), 'timetable', tag),
    words: {
      shows: 'Timetable only',
      place,
      classUntil: ended ? null : end,
      classEnded: ended ? end : null,
      timetable: null,
    },
  };
}

// The level the map draws a Friend at: a view at the exact level without a position, or at the building without a
// Place, shows the Timetable only.
export function shownLevel({ level, position, placeId }: FriendView): FriendView['level'] {
  if (level === 'exact') {
    return position === null ? 'timetable' : 'exact';
  }
  return level === 'building' && placeId !== null ? 'building' : 'timetable';
}

function drawnOf(args: FriendArgs, naming: PlaceNaming): Drawn {
  const { position, placeId } = args.friend;
  const level = shownLevel(args.friend);
  if (level === 'exact' && position !== null) {
    return exactly(args, { latitude: position.latitude, longitude: position.longitude }, naming);
  }
  if (level === 'building' && placeId !== null) {
    return atBuilding(args, placeId, naming);
  }
  return byTimetable(args, naming);
}

export function friendAnswer(args: FriendArgs): FriendAnswer {
  const { friend } = args;
  const { lines, basis, scene, words } = drawnOf(args, new PlaceNaming(args.placeOf));
  return {
    lookup: {
      kind: 'friend',
      chips: [{ kind: 'person', text: friend.name, userId: friend.id }],
      lines,
      basis,
      scene,
      band: null,
      actions: [{ kind: 'meet', userId: friend.id }],
    },
    words: { name: othersText('friend.name', friend.name), ...words },
  };
}

// The line of a pressed Place's card for a Friend the asker's map shows in it; at the Timetable only, it says so.
function hereText({ friend, classes, now }: FriendArgs, placeId: string): string | null {
  if (shownLevel(friend) !== 'timetable') {
    return friend.placeId === placeId
      ? `${withSubject(friend.name)} 여기 있어요 · ${timetableLabel(classes, now, ' ')}`
      : null;
  }
  const located = classAt(classes, now);
  if (located === null || located.placeId !== placeId) {
    return null;
  }
  const end = clockOf(located.item.end);
  return located.ended
    ? `${withTopic(friend.name)} ${end}에 여기서 수업이 끝났어요`
    : `시간표로는 ${withSubject(friend.name)} ${end}까지 여기서 수업이에요`;
}

// A Friend the asker's map shows in the Place: their line, which opens their card, and how the map draws them.
export function friendHere(
  args: FriendArgs,
  placeId: string,
): { fact: CardFact; person: MapScene['people'][number] } | null {
  const text = hereText(args, placeId);
  const [person] = drawnOf(args, new PlaceNaming(args.placeOf)).scene.people;
  return text === null || person === undefined ? null : { fact: fact('user', text, args.friend.id), person };
}

export interface FriendTapArgs extends FriendArgs {
  // Where the asker sets out from, as a chip calls it; null when it is not known.
  start: { placeId: string; label: string } | null;
  walkMinutes: (fromPlaceId: string, toPlaceId: string) => number;
}

const LEVEL_WORDS: Record<FriendWords['shows'], string> = {
  'exact location': '정확한 위치까지 보여요',
  'the building they are in': '지금 있는 건물까지 보여요',
  'Timetable only': '시간표만 보여요',
};

// The Timetable label, the Place the map shows them at, and the walk there from the asker, counted unless either end
// is unknown or both are the same Place.
function shownFacts(args: FriendTapArgs, place: string | null): { facts: CardFact[]; from: string | null } {
  const { friend, classes, now, nearPlaceId, start, walkMinutes } = args;
  const placeId = friend.placeId ?? nearPlaceId;
  const walking = start !== null && placeId !== null && start.placeId !== placeId;
  const facts = [
    fact('clock', timetableLabel(classes, now)),
    ...(place === null ? [] : [fact('pin', place)]),
    ...(walking ? [fact('route', `나에게서 걸어서 ${walkMinutes(start.placeId, placeId)}분`)] : []),
  ];
  return { facts, from: walking ? start.label : null };
}

function classWords({ classes, now }: FriendArgs, naming: PlaceNaming): string {
  const located = classAt(classes, now);
  if (located === null) {
    return timetableLabel(classes, now);
  }
  const place = naming.placeLabel(located.placeId);
  const end = clockOf(located.item.end);
  return located.ended
    ? `${end}에 ${place} 수업이 끝났어요 · ${timetableLabel(classes, now, ' ')}`
    : `시간표로는 ${end}까지 ${place} 수업이에요`;
}

// The Class as the Timetable gives it, the next one, and that the position is not shown.
function timetableFacts(args: FriendArgs): CardFact[] {
  const naming = new PlaceNaming(args.placeOf);
  const next = nextOf(args.classes, args.now);
  const nextPlace = next === undefined || next.placeId === null ? '' : ` · ${naming.placeLabel(next.placeId)}`;
  return [
    fact('clock', classWords(args, naming)),
    ...(next === undefined ? [] : [fact('calendar', `다음 수업 ${clockOf(next.start)}${nextPlace}`)]),
    fact('lock', HIDDEN),
  ];
}

// A pressed Friend's face: the Friend Lookup with the card of what the asker's map shows of them.
export function friendTap(args: FriendTapArgs): Lookup {
  const { lookup, words } = friendAnswer(args);
  const { facts, from } =
    words.shows === 'Timetable only' ? { facts: timetableFacts(args), from: null } : shownFacts(args, words.place);
  return {
    ...lookup,
    chips: from === null ? [] : [{ kind: 'origin', text: `${from}에서`, userId: null }],
    card: cardOf(args.friend.name, LEVEL_WORDS[words.shows], facts, null),
  };
}

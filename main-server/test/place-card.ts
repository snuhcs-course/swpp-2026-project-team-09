/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type CardFact, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { mealAt, placeAnswer, type PlaceArgs } from '../src/assistant/lookup/place-lookup.js';
import { type FriendView } from '../src/friends/dto/friend-view.dto.js';
import { MenuLineKind } from '../src/generated/prisma/client.js';
import { type MenuLineDto } from '../src/menus/dto/restaurant-menus.dto.js';
import { classAt, id, ME, position, TUESDAY, wayArgs } from './way-example.js';

// The pressed buildings of wireframe row 6 on the seed's Places and walking table: on Tuesday 2026-11-17 at 12:10 the
// User is in 301동 after a Class there until 11:50, with the next at 13:00 in 24동. Call `readCampus` in a beforeAll
// first.

export const MINSU = 'b0c2e3a4-0000-4000-8000-000000000002';

const tuesday = (): DayItem[] => [
  classAt(TUESDAY, '11:00', '11:50', '제1공학관'),
  classAt(TUESDAY, '13:00', '13:50', '자연과학관6'),
];

const at301 = (): PlaceArgs['way']['location'] => ({
  at: position('제1공학관'),
  placeId: id('제1공학관'),
  onCampus: true,
});

export const dish = (name: string): MenuLineDto => ({
  text: `${name} : 6,000원`,
  kind: MenuLineKind.dish,
  name,
  price: 6000,
});

export const NOTE: MenuLineDto = { text: '※ 운영시간 : 11:00~14:30', kind: MenuLineKind.note, name: null, price: null };

// A Friend as the Friend view gives them, at the Timetable only unless changed.
export const friendView = (userId: string, name: string, changes: Partial<FriendView> = {}): FriendView => ({
  id: userId,
  name,
  department: '컴퓨터공학부',
  friendId: 'MNS23456',
  friendsSince: '2026-09-01T12:00:00+09:00',
  level: 'timetable',
  position: null,
  placeId: null,
  ...changes,
});

export const minsu = (changes: Partial<FriendView> = {}): FriendView => friendView(MINSU, '김민수', changes);

// 김민수's Class in 302동 until 12:15.
export const minsuIn302 = (): DayItem[] => [classAt(TUESDAY, '11:00', '12:15', '제2공학관')];

export interface Pressed {
  date?: string;
  clock?: string;
  items?: DayItem[];
  location?: PlaceArgs['way']['location'];
  // The Place whose outline holds the location: 301동 for the default location, else none unless given.
  inside?: string | null;
  restaurants?: { name: string; lines: MenuLineDto[] }[];
  events?: PlaceArgs['events'];
  friends?: PlaceArgs['friends'];
}

function insideOf({ location, inside }: Pressed): string | null {
  if (inside !== undefined) {
    return inside;
  }
  return location === undefined ? id('제1공학관') : null;
}

// The card of the Place of that name, pressed on Tuesday at 12:10 from inside 301동 unless given otherwise.
export function pressed(name: string, given: Pressed = {}): Lookup {
  const now = onDay(given.date ?? TUESDAY, given.clock ?? '12:10');
  const meal = mealAt(now);
  const location = given.location === undefined ? at301() : given.location;
  return placeAnswer({
    placeId: id(name),
    inside: insideOf(given),
    way: wayArgs(now, { me: { userId: ME, name: '유상', items: given.items ?? tuesday() }, location }),
    meal: meal === null ? null : { meal, restaurants: given.restaurants ?? [] },
    events: given.events ?? [],
    friends: given.friends ?? [],
  });
}

export const facts = (lookup: Lookup): CardFact[] => lookup.card?.facts ?? [];

export const plain = (icon: CardFact['icon'], text: string, userId: string | null = null): CardFact => ({
  icon,
  text,
  strong: false,
  userId,
});

export const strong = (icon: CardFact['icon'], text: string): CardFact => ({
  icon,
  text,
  strong: true,
  userId: null,
});

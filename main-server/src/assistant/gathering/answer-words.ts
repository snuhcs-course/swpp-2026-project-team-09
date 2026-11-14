/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { SHORTEST_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { type PlanInput, type PlacePoint } from '../dto/answer.dto.js';
import { type DayItem } from '../free-time/free-time.js';
import {
  type Gathering,
  type GatheringDrop,
  type GatheringFit,
  type GatheringSide,
  type PersonPart,
} from './gathering.js';

// What the words of a meal's answer share: who is who, how a Place is called, and the pieces of a way.

export interface AnswerPerson {
  userId: string;
  name: string;
  me: boolean;
  // Their items of the day, for the time band's lanes and for wording where they set out from.
  items: readonly DayItem[];
  // The position the asker may see of them now (the asker's own for the asker), or null.
  position: Position | null;
}

export interface MealAnswerArgs {
  input: PlanInput;
  now: Date;
  // In the order of input.people, the asker first.
  people: readonly [AnswerPerson, ...AnswerPerson[]];
  gathering: Gathering;
  // The asker's longest meal alone under the same conditions, when Friends are in the plan; null otherwise or when
  // none fits.
  aloneMinutes: number | null;
  // No menu collected for the day, menus but no Restaurant with a Place open for the meal, or open ones.
  menus: 'none' | 'closed' | 'open';
  placeOf: (placeId: string) => PlaceDto;
}

const SHORTEST_MEAL_MINUTES = SHORTEST_MEAL_SECONDS / 60;
const HANGUL_FIRST = 0xac_00;
const HANGUL_SYLLABLES = 11_172;
const FINALS = 28;

// Whether the last syllable of a word has a final consonant, which picks 은 over 는 and 과 over 와.
function hasFinal(word: string): boolean {
  const syllable = (word.at(-1)?.codePointAt(0) ?? 0) - HANGUL_FIRST;
  return syllable >= 0 && syllable < HANGUL_SYLLABLES && syllable % FINALS !== 0;
}

export const withTopic = (word: string): string => `${word}${hasFinal(word) ? '은' : '는'}`;

export const withAnd = (word: string): string => `${word}${hasFinal(word) ? '과' : '와'}`;

// The item a person was busy with up to `readyAt`.
export function itemBefore(items: readonly DayItem[], readyAt: Date): DayItem | null {
  const before = items.filter(({ end }) => end <= readyAt).toSorted((a, b) => a.end.getTime() - b.end.getTime());
  return before.at(-1) ?? null;
}

// The item a part's next start is, or one standing for it that is not a Class.
export function itemAt(items: readonly DayItem[], next: GatheringSide['next']): DayItem | null {
  if (next === null) {
    return null;
  }
  const item = items.find(({ start }) => start.getTime() === next.start.getTime());
  return item ?? { id: '', name: '', start: next.start, end: next.start, placeId: next.placeId, isClass: false };
}

// A Friend's way to the merging point and on from there, or null when they do not merge.
export function mergingLegs(
  { personId, walkMinutes }: PersonPart,
  meeting: GatheringFit['meeting'],
): { toMeeting: number; onward: number } | null {
  if (meeting === null || !meeting.personIds.includes(personId) || walkMinutes === null) {
    return null;
  }
  return { toMeeting: walkMinutes - meeting.onwardMinutes, onward: meeting.onwardMinutes };
}

// The asker's walk from the place to their next item's Place, when it has one.
export function wayOn(part: PersonPart | undefined): { placeId: string; minutes: number } | null {
  const next = part?.next ?? null;
  if (next === null || next.placeId === null || next.walkMinutes === null) {
    return null;
  }
  return { placeId: next.placeId, minutes: next.walkMinutes };
}

// Who is who and how Places are called. A Place is called by its number, as the app calls it (301동), and otherwise by
// its name; a Restaurant by its key.
export class Naming {
  constructor(readonly args: MealAnswerArgs) {}

  get asker(): AnswerPerson {
    return this.args.people[0];
  }

  personOf(userId: string): AnswerPerson {
    const person = this.args.people.find((each) => each.userId === userId);
    if (person === undefined) {
      throw new Error(`No person ${userId} in the plan`);
    }
    return person;
  }

  placeLabel(placeId: string): string {
    const { number, name } = this.args.placeOf(placeId);
    return number === null ? name : `${number}동`;
  }

  position(placeId: string): Position {
    const { latitude, longitude } = this.args.placeOf(placeId);
    return { latitude, longitude };
  }

  placePoint(placeId: string): PlacePoint {
    return this.labelledPoint(placeId, this.placeLabel(placeId));
  }

  labelledPoint(placeId: string, label: string): PlacePoint {
    return { placeId, label, ...this.position(placeId) };
  }

  mealWord(): string {
    return this.args.input.meal === 'lunch' ? '점심' : '저녁';
  }

  dropReason({ togetherMinutes, shortest }: GatheringDrop): string {
    if (shortest.minutes >= SHORTEST_MEAL_MINUTES) {
      return `같이 있는 시간이 ${togetherMinutes}분뿐이에요`;
    }
    const person = this.personOf(shortest.personId);
    const stay = `${shortest.minutes}분밖에 못 있어요`;
    return person.me ? stay : `${withTopic(person.name)} ${stay}`;
  }
}

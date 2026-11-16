/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { SHORTEST_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { type MealInput, type MeetInput } from '../dto/answer.dto.js';
import { type FriendLevel } from '../../friends/dto/friend-view.dto.js';
import { clockOf, type DayItem } from '../free-time/free-time.js';
import {
  type Gathering,
  type GatheringDrop,
  type GatheringFit,
  type GatheringSide,
  type PersonPart,
} from './gathering.js';
import { type ServedMenu } from './meal-menu.js';
import { type MissingInputs } from './missing-inputs.js';
import { PlaceNaming } from './place-naming.js';
import { type Unmet } from './unmet-plans.js';

// What the words of a meal's answer share: who is who, how a Place is called, and the pieces of a way.

export interface AnswerPerson {
  userId: string;
  name: string;
  me: boolean;
  // Their items of the day, for the time band's lanes and for wording where they set out from.
  items: readonly DayItem[];
  // The position the asker may see of them now (the asker's own for the asker), or null.
  position: Position | null;
  // How much of a Friend the asker sees.
  level?: FriendLevel;
}

// What the words of a gathering's answer read, a meal's or a meet's.
export interface GatheringArgs<Input extends MealInput | MeetInput = MealInput | MeetInput> {
  input: Input;
  now: Date;
  // In the order of input.people, the asker first.
  people: readonly [AnswerPerson, ...AnswerPerson[]];
  gathering: Gathering;
  placeOf: (placeId: string) => PlaceDto;
}

export interface MealAnswerArgs extends GatheringArgs<MealInput> {
  // The asker's longest meal alone under the same conditions, when Friends are in the plan; null otherwise or when
  // none fits.
  aloneMinutes: number | null;
  // No menu collected for the day, menus but no Restaurant with a Place open for the meal, open ones but none at the
  // Place the User fixed, or open ones.
  menus: 'none' | 'closed' | 'closed-at-place' | 'open';
  // What the app could not give, left out when nothing was missing.
  missing?: MissingInputs;
  // What of the conditions could not be met, left out when all were.
  unmet?: Unmet;
  // Each open Restaurant's menu for the meal, by its key, which its Plan says.
  served?: ReadonlyMap<string, ServedMenu>;
}

const SHORTEST_MEAL_MINUTES = SHORTEST_MEAL_SECONDS / 60;
const HANGUL_FIRST = 0xac_00;
const HANGUL_SYLLABLES = 11_172;
const FINALS = 28;

// Whether the last syllable of a word has a final consonant, which picks 은 over 는, 과 over 와, 이 over 가, and 이에요
// over 예요.
function hasFinal(word: string): boolean {
  const syllable = (word.at(-1)?.codePointAt(0) ?? 0) - HANGUL_FIRST;
  return syllable >= 0 && syllable < HANGUL_SYLLABLES && syllable % FINALS !== 0;
}

export const withTopic = (word: string): string => `${word}${hasFinal(word) ? '은' : '는'}`;

export const withAnd = (word: string): string => `${word}${hasFinal(word) ? '과' : '와'}`;

export const withSubject = (word: string): string => `${word}${hasFinal(word) ? '이' : '가'}`;

export const withCopula = (word: string): string => `${word}${hasFinal(word) ? '이에요' : '예요'}`;
// 으로 after a final consonant other than ㄹ, and 로 otherwise.
const FINAL_RIEUL = 8;
export const withToward = (word: string): string => {
  const syllable = (word.at(-1)?.codePointAt(0) ?? 0) - HANGUL_FIRST;
  return `${word}${hasFinal(word) && syllable % FINALS !== FINAL_RIEUL ? '으로' : '로'}`;
};

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

export { placeLabelOf } from './place-naming.js';

// Who is who and how Places are called; a candidate by its key.
export class GatheringNaming<Args extends GatheringArgs = GatheringArgs> extends PlaceNaming {
  constructor(readonly args: Args) {
    super(args.placeOf);
  }

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

  dropReason({ togetherMinutes, shortest, closing }: GatheringDrop): string {
    if (closing !== undefined) {
      return `${clockOf(closing.at)} 닫아요`;
    }
    if (shortest.minutes >= SHORTEST_MEAL_MINUTES) {
      return `같이 있는 시간이 ${togetherMinutes}분뿐이에요`;
    }
    const person = this.personOf(shortest.personId);
    const stay = `${shortest.minutes}분밖에 못 있어요`;
    return person.me ? stay : `${withTopic(person.name)} ${stay}`;
  }
}

export type Naming = GatheringNaming<MealAnswerArgs>;

export const mealWord = ({ args }: { args: Pick<MealAnswerArgs, 'input'> }): string =>
  args.input.meal === 'lunch' ? '점심' : '저녁';

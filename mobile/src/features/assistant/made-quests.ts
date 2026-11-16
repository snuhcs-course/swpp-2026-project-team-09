/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ConditionChip, MapScene } from '@/api/assistant-types';
import type { LatLng, Person, Quest, SubQuest } from '@/api/types';
import { pointOf } from '@/features/quests/adapter';
import { koreaClock, koreaDay, koreaDaysAfter } from '@/korea-time';
import type { Standing } from './invited-friends';

// A Quest made from a Plan on this phone that the User waits on.
export interface MadeQuest {
  quest: Quest;
  // Where everyone is together: the last step not cancelled that has a start and a point. A Plan writes its meeting
  // steps before the meal. Its `title` says when and what, "12:33 점심", and its `day` the day when that is not today,
  // as the Quest's own card says a day, "내일" or "11월 17일 (화)"; null today.
  destination: { step: SubQuest; startsAt: string; at: LatLng; day: string | null; title: string };
  // The members but the User: the Friends invited, whatever they answered.
  friends: Person[];
}

// The server writes a Plan's title as "<Restaurant>에서 <meal>".
const BEFORE_MEAL = '에서 ';
const IN = new Set<Standing['state']>(['accepted', 'late']);

function mealWord(title: string): string {
  const at = title.lastIndexOf(BEFORE_MEAL);
  return at < 0 ? title : title.slice(at + BEFORE_MEAL.length);
}

function startOf({ startsAt }: SubQuest): number {
  return startsAt === null ? Number.NEGATIVE_INFINITY : Date.parse(startsAt);
}

function dayOf(startsAt: string, now: Date): string | null {
  return koreaDaysAfter(now, new Date(startsAt)) === 0 ? null : koreaDay(startsAt, now);
}

// "12:33 점심", or "11월 17일 (화) 12:33 점심" on another day.
function destinationWords({ day, title }: MadeQuest['destination']): string {
  return day === null ? title : `${day} ${title}`;
}

// What the step a flag stands at is: the meal the Quest's title names when it is the Quest's last step, as a Plan's
// meal is, and else its own title, as a meeting step's once the meal was cancelled.
function stepWord(quest: Quest, step: SubQuest): string {
  const last = quest.subQuests.toSorted((one, other) => startOf(one) - startOf(other)).at(-1);
  return last === step ? mealWord(quest.title) : step.title;
}

function destinationOf(quest: Quest, now: Date): MadeQuest['destination'] | null {
  const timed = quest.subQuests.flatMap((step) => {
    const at = pointOf(step.place);
    return step.cancelled || step.startsAt === null || at === null ? [] : [{ step, startsAt: step.startsAt, at }];
  });
  const last = timed.toSorted((one, other) => startOf(one.step) - startOf(other.step)).at(-1);
  if (last === undefined || last.step.ended || Date.parse(last.step.endsAt ?? last.startsAt) <= now.getTime()) {
    return null;
  }
  const title = `${koreaClock(last.startsAt)} ${stepWord(quest, last.step)}`;
  return { ...last, day: dayOf(last.startsAt, now), title };
}

// The Quests made from a Plan among the User's: those whose id the phone kept (`ids`), which the User leads and whose
// destination has not ended by `now`, the earliest first. A Closed Quest that is no Class Quest, as POST /plans makes
// one, with the Friends invited, or none for a Quest the User holds alone (P05-14).
export function madeQuests(quests: readonly Quest[], meId: string, now: Date, ids: readonly string[]): MadeQuest[] {
  return quests
    .flatMap((quest): MadeQuest[] => {
      const led = quest.leader?.id === meId && quest.joinPolicy === 'closed' && !quest.classQuest;
      if (!led || !ids.includes(quest.id)) {
        return [];
      }
      const friends = (quest.members ?? []).map(({ user }) => user).filter(({ id }) => id !== meId);
      const destination = destinationOf(quest, now);
      return destination === null ? [] : [{ quest, destination, friends }];
    })
    .toSorted((one, other) => Date.parse(one.destination.startsAt) - Date.parse(other.destination.startsAt));
}

// The ids of `ids` that the phone no longer needs: their Quest is gone from the User's Quests, or its destination has
// ended by `now`.
export function endedIds(quests: readonly Quest[], ids: readonly string[], now: Date): string[] {
  return ids.filter((id) => {
    const quest = quests.find((one) => one.id === id);
    return quest === undefined || destinationOf(quest, now) === null;
  });
}

// What a made Quest's flag and its line say: `words` in one line, "11월 17일 (화) 12:15 점심 · 수락 0/1", as the line
// above the input and the flag's name say it. The flag's label is 180 points wide at most and would cut that, so it
// draws `flag`: the destination's title, "12:15 점심", over its day when that is not today and the count,
// "11월 17일 (화) · 수락 0/1".
export interface FlagWords {
  words: string;
  flag: { title: string; line: string };
}

// A Quest the User holds alone, with nobody invited: a Plan taken with "여기로", or a seat's stay. It is no 파티.
export function isAlone({ friends }: MadeQuest): boolean {
  return friends.length === 0;
}

// The destination's words, and how many Friends are in, accepted or late, out of every Friend invited, one who
// declined included: "12:33 점심 · 수락 1/2". A Quest held alone counts nobody, and its flag's line says the day.
export function flagWords({ destination, friends }: MadeQuest, standings: ReadonlyMap<string, Standing>): FlagWords {
  if (friends.length === 0) {
    return {
      words: destinationWords(destination),
      flag: { title: destination.title, line: destination.day ?? '오늘' },
    };
  }
  const accepted = friends.filter(({ id }) => {
    const standing = standings.get(id);
    return standing !== undefined && IN.has(standing.state);
  }).length;
  const count = `수락 ${accepted}/${friends.length}`;
  return {
    words: `${destinationWords(destination)} · ${count}`,
    flag: { title: destination.title, line: destination.day === null ? count : `${destination.day} · ${count}` },
  };
}

// The person chips of the card after inviting, one for each Friend invited.
export function friendChips({ friends }: MadeQuest): ConditionChip[] {
  return friends.map(({ id, name }) => ({ kind: 'person', text: name, userId: id }));
}

function stepWords({ startsAt, title }: SubQuest): string {
  return startsAt === null ? title : `${koreaClock(startsAt)} ${title}`;
}

// What the map draws for a made Quest: the User at `me`, the destination with its words, and a dark flag at each other
// step's Place with its start and title. Nobody else, no route, and nothing that a Friend's answer changes.
export function madeQuestScene({ quest, destination }: MadeQuest, me: { userId: string; at: LatLng | null }): MapScene {
  const { step, at } = destination;
  const steps = quest.subQuests.flatMap((other) => {
    const point = pointOf(other.place);
    return other === step || other.cancelled || point === null
      ? []
      : [{ at: point, text: stepWords(other), role: 'meeting' as const }];
  });
  return {
    people: me.at === null ? [] : [{ userId: me.userId, name: '나', me: true, at: me.at, source: 'exact', tag: null }],
    places: [
      { place: { placeId: step.place?.placeId ?? '', label: step.place?.label ?? '', ...at }, role: 'pick', tag: null },
    ],
    routes: [],
    flags: [{ at, text: destinationWords(destination), role: 'place' }, ...steps],
  };
}

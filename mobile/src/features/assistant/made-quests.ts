/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ConditionChip, MapScene } from '@/api/assistant-types';
import type { LatLng, Person, Quest, SubQuest } from '@/api/types';
import { pointOf } from '@/features/quests/adapter';
import { koreaClock } from '@/korea-time';
import type { Standing } from './invited-friends';

// A Quest made from a Plan that the User waits on. Nothing the main server sends marks one, so it is any Closed Quest
// the User leads with someone else among its members, a 비공개 Quest made by hand with invited Friends included.
export interface MadeQuest {
  quest: Quest;
  // Where everyone is together: the last step not cancelled that has a start and a point. A Plan writes its meeting
  // steps before the meal.
  destination: { step: SubQuest; startsAt: string; at: LatLng };
  // The members but the User: the Friends invited, whatever they answered.
  friends: Person[];
}

// The server writes a Plan's title as "<Restaurant>에서 <meal>".
const BEFORE_MEAL = '에서 ';
const IN = new Set<Standing['state']>(['accepted', 'late']);

function destinationOf(quest: Quest, now: Date): MadeQuest['destination'] | null {
  const timed = quest.subQuests.flatMap((step) => {
    const at = pointOf(step.place);
    return step.cancelled || step.startsAt === null || at === null ? [] : [{ step, startsAt: step.startsAt, at }];
  });
  const last = timed.toSorted((one, other) => Date.parse(one.startsAt) - Date.parse(other.startsAt)).at(-1);
  if (last === undefined || last.step.ended || Date.parse(last.step.endsAt ?? last.startsAt) <= now.getTime()) {
    return null;
  }
  return last;
}

// The Quests made from a Plan among the User's, whose destination has not ended by `now`, the earliest first.
export function madeQuests(quests: readonly Quest[], meId: string, now: Date): MadeQuest[] {
  return quests
    .flatMap((quest): MadeQuest[] => {
      if (quest.classQuest || quest.joinPolicy !== 'closed' || quest.leader?.id !== meId) {
        return [];
      }
      const friends = (quest.members ?? []).map(({ user }) => user).filter(({ id }) => id !== meId);
      const destination = destinationOf(quest, now);
      return friends.length === 0 || destination === null ? [] : [{ quest, destination, friends }];
    })
    .toSorted((one, other) => Date.parse(one.destination.startsAt) - Date.parse(other.destination.startsAt));
}

function mealWord(title: string): string {
  const at = title.lastIndexOf(BEFORE_MEAL);
  return at < 0 ? title : title.slice(at + BEFORE_MEAL.length);
}

// "12:33 점심 · 수락 1/2": the destination's start, the meal, and how many Friends are in, accepted or late, out of
// every Friend invited, one who declined included.
export function flagWords(
  { quest, destination, friends }: MadeQuest,
  standings: ReadonlyMap<string, Standing>,
): string {
  const accepted = friends.filter(({ id }) => {
    const standing = standings.get(id);
    return standing !== undefined && IN.has(standing.state);
  }).length;
  return `${koreaClock(destination.startsAt)} ${mealWord(quest.title)} · 수락 ${accepted}/${friends.length}`;
}

// The person chips of the card after inviting, one for each Friend invited.
export function friendChips({ friends }: MadeQuest): ConditionChip[] {
  return friends.map(({ id, name }) => ({ kind: 'person', text: name, userId: id }));
}

function stepWords({ startsAt, title }: SubQuest): string {
  return startsAt === null ? title : `${koreaClock(startsAt)} ${title}`;
}

// What the map draws for a made Quest: the User at `me`, the destination with the flag's `words`, and a dark flag at
// each other step's Place with its start and title. Nobody else, and no route.
export function madeQuestScene(
  { quest, destination }: MadeQuest,
  words: string,
  me: { userId: string; at: LatLng | null },
): MapScene {
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
    flags: [{ at, text: words, role: 'place' }, ...steps],
  };
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type KeptKind, type KeptQuest } from '../../quests/kept-quests.js';
import { type KeptQuestDto } from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';

// The User's Quests of a day as the day's Lookup draws them and the model reads them. The drawing gives a Quest's title
// and the others in it, as the User sees them in their own schedule; a Class stays its time and building. The model
// reads everything the User may see of them, the words others wrote inside the delimiters for collected text.

export const KIND_WORDS: Record<KeptKind, string> = {
  'meal-lunch': '점심',
  'meal-dinner': '저녁',
  meet: '약속',
  event: '행사',
  seat: '자리',
  other: '일정',
};

// A Quest's start and end, "14:00–15:30", or its start alone.
export const keptSpan = ({ start, end }: KeptQuest): string =>
  end === null ? clockOf(start) : `${clockOf(start)}–${clockOf(end)}`;

// What the model is told of a kept Quest. `ref` is its id, which findDay and the planners take.
export function keptWords(kept: KeptQuest, place: string | null): object {
  const { questId, kind, title, start, end, people, mine, changeable } = kept;
  return {
    ref: questId,
    kind,
    title: othersText('quest.title', title),
    start: clockOf(start),
    end: end === null ? null : clockOf(end),
    place: place === null ? null : othersText('quest.place', place),
    people: people.map(({ name, answer }) => ({ name: othersText('friend.name', name), answer })),
    mine,
    changeable,
  };
}

// The Quests asked for by their ids or the first 8 characters of them, as the day's line gives them; every Quest when
// none is asked for. A ref that fits two Quests picks none: the asker is answered that it is ambiguous.
export function keptAsked(
  kept: readonly KeptQuest[],
  asked: readonly string[] | undefined,
): { quests: KeptQuest[]; ambiguous: boolean } {
  if (asked === undefined || asked.length === 0) {
    return { quests: [...kept], ambiguous: false };
  }
  const fits = asked.map((id) => kept.filter(({ questId }) => questId.startsWith(id.toLowerCase())));
  const ambiguous = fits.some((each) => each.length > 1);
  return { quests: ambiguous ? [] : kept.filter((quest) => fits.some((each) => each.includes(quest))), ambiguous };
}

// A Quest of the User's own day as its step reads: its title, then the others who have not declined, so that two
// meetings are told apart. It is the User's own schedule, and they hold or were invited to every Quest of it.
export function keptStep({ title, people }: KeptQuest): string {
  return [title, ...people.filter(({ answer }) => answer !== 'declined').map(({ name }) => name)].join(' · ');
}

export function keptDto(kept: KeptQuest, place: string | null): KeptQuestDto {
  const { kind, questId, title, start, end, people, mine, changeable } = kept;
  return {
    kind,
    questId,
    title,
    startAt: koreaTime(start),
    endAt: end === null ? null : koreaTime(end),
    place,
    people: people.map(({ name, answer }) => ({ name, answer })),
    mine,
    changeable,
  };
}

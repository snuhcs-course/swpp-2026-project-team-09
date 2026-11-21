/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockOf } from '../free-time/free-time.js';
import { othersText } from '../others-text.js';
import { type AnswerPerson } from './answer-words.js';

// Who of a plan is busy at a start the User fixed, and until when (P05 ticket 26): a Friend of the plan by their name
// and the end of what keeps them, never what it is or where; the asker by the name of their own Class or Quest too.
export interface BusyAt {
  who: 'you' | 'friend';
  name: string;
  until: string;
  kind: 'class' | 'quest';
}

export function busyAt(people: readonly AnswerPerson[], asked: Date): BusyAt[] {
  return people.flatMap((person): BusyAt[] => {
    const item = person.items.find(({ start, end }) => start <= asked && asked < end);
    if (item === undefined) {
      return [];
    }
    const name = person.me ? othersText('item.name', item.name) : othersText('friend.name', person.name);
    return [
      { who: person.me ? 'you' : 'friend', name, until: clockOf(item.end), kind: item.isClass ? 'class' : 'quest' },
    ];
  });
}

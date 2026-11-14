/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MadeQuestView } from '@/features/assistant/use-made-quests';
import { type CardView, cardId } from './adapter';
import { shortTitle } from './short-name';

// One card for each Quest made from a Plan, with the id of that Quest's own card, so that an address or a selection of
// the Quest finds it: its marker is the flag at the destination, which stands apart from the place groups.
export function madeQuestCards(made: readonly MadeQuestView[]): CardView[] {
  return made.map(({ quest, destination, words }) => ({
    id: cardId.quest(quest.id),
    kind: 'made-quest',
    mark: { type: 'place', place: 'party' },
    marker: { name: words, short: shortTitle(quest.title), count: 0, minutesOld: null },
    subLabel: '비공개 파티',
    title: quest.title,
    lines: [],
    primary: null,
    secondary: null,
    position: destination.at,
    flag: words,
  }));
}

// The map's cards but the Quests' own cards that `flags` take the place of.
export function withoutMade(cards: readonly CardView[], flags: readonly CardView[]): readonly CardView[] {
  if (flags.length === 0) {
    return cards;
  }
  const ids = new Set(flags.map(({ id }) => id));
  return cards.filter(({ id }) => !ids.has(id));
}

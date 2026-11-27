/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';
import type { StudyInput } from '@/api/study-plan-types';
import { koreaClock, koreaDateKey } from '@/korea-time';
import type { Stretch } from './time-band';

// "＋ 같이" on the seat answer alone (P10 ticket 15): the study answer together asked from the seat card.

// The study input of studying together asked from the seat card: the span the picker shows, which leaves everyone's
// busy stretches as a meal's "＋ 같이" does, as the day, the window and the length; the card's space as the seat
// chosen; the asker and then the Friends picked. `what` and `area` are an answer alone's only.
export function seatTogetherInput(shown: Stretch, space: LibrarySpace, people: readonly string[]): StudyInput {
  return {
    kind: 'study',
    date: koreaDateKey(new Date(shown.startAt)),
    what: 'any',
    people: people.map((userId) => ({ userId, constraints: [] })),
    together: true,
    window: { from: koreaClock(shown.startAt), until: koreaClock(shown.endAt) },
    area: null,
    minutes: Math.round((Date.parse(shown.endAt) - Date.parse(shown.startAt)) / 60_000),
    chosen: { seatSpaceId: space.id, roomSpaceId: null },
  };
}

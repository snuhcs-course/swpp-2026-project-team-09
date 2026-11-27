/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Quest } from '@/api/types';
import { DINNER } from './server';

// A Quest of the User on Monday 2026-11-02, the library chat's day (`startLibraryChat`), with one Sub Quest `${id}-1`
// from `start` to `end` at `label`: a Class when `classQuest`, by whose Sub Quest id the conversation leaves it out.
const nov2 = (clock: string): string => `2026-11-02T${clock}:00+09:00`;

export function onNov2(
  id: string,
  title: string,
  start: string,
  end: string,
  label: string,
  classQuest: boolean,
): Quest {
  const [sub] = DINNER.subQuests;
  if (sub === undefined) {
    throw new Error('DINNER has no Sub Quest');
  }
  const place = { placeId: null, label, latitude: null, longitude: null };
  return {
    ...DINNER,
    id,
    title,
    classQuest,
    subQuests: [{ ...sub, id: `${id}-1`, title, startsAt: nov2(start), endsAt: nov2(end), place }],
  };
}

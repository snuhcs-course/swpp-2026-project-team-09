/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { FRAMED_PARTS, PHOTO_SET } from '@/api/mock/data/quest-parts';
import type { QuestEntries, QuestPhoto } from '@/api/quest-parts-types';
import { pickFor } from './stable-pick';

// The mock adapter for a Quest's photo, in both builds. Replaced by the main server's photo once it stores one.

// The photo the User entered for a Quest they made; else the frame's for a Quest of the mock's, and one of the mock's
// set by the id for any other. A Class Quest has no post, so it has no photo.
export function photoOf(
  quest: { id: string; classQuest?: boolean },
  entered: QuestEntries | undefined,
): QuestPhoto | null {
  if (entered !== undefined) {
    return entered.photo;
  }
  if (quest.classQuest === true) {
    return null;
  }
  const framed = FRAMED_PARTS[quest.id];
  return framed === undefined ? pickFor(quest.id, PHOTO_SET) : framed.photo;
}

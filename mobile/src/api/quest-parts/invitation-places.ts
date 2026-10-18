/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { FRAMED_INVITATION_PLACES, INVITATION_PLACE_SET } from '@/api/mock/data/quest-parts';
import type { QuestSummary } from '@/api/waiting-types';
import type { Build } from './build';
import { pickFor } from './stable-pick';

// The mock adapter for where an invitation's Quest meets. The mock build gives the frame's place for a Quest of the
// mock's and one of the mock's set by the id for any other; the server build gives none, as for the time
// (`./invitation-times.ts`). Replaced once the invitation carries its Quest's next Sub Quest.
export function invitationPlaceOf({ id }: QuestSummary, build: Build): string | null {
  if (build === 'server') {
    return null;
  }
  return FRAMED_INVITATION_PLACES[id] ?? pickFor(id, INVITATION_PLACE_SET);
}

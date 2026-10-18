/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { FRAMED_INVITATION_TIMES, INVITATION_TIME_SET } from '@/api/mock/data/quest-parts';
import type { QuestSummary } from '@/api/waiting-types';
import { koreaInstant } from '@/korea-time';
import type { Build } from './build';
import { pickFor } from './stable-pick';

// The mock adapter for when an invitation's Quest meets. The main server's invitation carries no Sub Quest, so the mock
// build gives the frame's time for a Quest of the mock's and one of the mock's set by the id for any other, counted from
// `now`. The server build gives none: a real invitation never carries an invented time (P06 spec, Mocks). Replaced
// once the invitation carries its Quest's next Sub Quest.
export function invitationStartOf({ id }: QuestSummary, build: Build, now: Date): string | null {
  if (build === 'server') {
    return null;
  }
  const { daysAhead, hour, minute } = FRAMED_INVITATION_TIMES[id] ?? pickFor(id, INVITATION_TIME_SET);
  return koreaInstant(now, daysAhead, hour, minute).toISOString();
}

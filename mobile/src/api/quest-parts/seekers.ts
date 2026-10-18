/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { COMPANION_SEEKERS } from '@/api/mock/data/finding';
import type { CompanionSeeker } from '@/api/quest-parts-types';
import { keepId, readKeptIds } from '@/storage/kept-ids';
import type { Build } from './build';

// The mock adapter for the people looking for company: the frame's in the mock build, and none in the build that
// asks the main server, where they would be people who do not exist (P06 spec, Mocks). Asking one is kept on the
// phone. Replaced once the main server lists them.

const ASKED = 'snunow.asked-seekers';

export async function listCompanionSeekers(build: Build): Promise<CompanionSeeker[]> {
  if (build === 'server') {
    return [];
  }
  const asked = await readKeptIds(ASKED);
  return COMPANION_SEEKERS.map((seeker) => Object.assign({ asked: asked.includes(seeker.id) }, seeker));
}

export async function askCompanionSeeker(seekerId: string): Promise<void> {
  await keepId(ASKED, seekerId);
}

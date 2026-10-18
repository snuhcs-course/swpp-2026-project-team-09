/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { OFFICIAL_RECRUITING } from '@/api/mock/data/finding';
import type { OfficialRecruiting } from '@/api/quest-parts-types';
import { keepId, readKeptIds } from '@/storage/kept-ids';
import type { Build } from './build';

// The mock adapter for official recruiting: the frame's in the mock build, and none in the build that asks the main
// server, where it would name organisations that gather nobody (P06 spec, Mocks). Joining one is kept on the phone.
// Replaced once the main server lists official recruiting.

const JOINED = 'snunow.joined-official';

export async function listOfficialRecruiting(build: Build): Promise<OfficialRecruiting[]> {
  if (build === 'server') {
    return [];
  }
  const joined = await readKeptIds(JOINED);
  return OFFICIAL_RECRUITING.map((recruiting) => Object.assign({ joined: joined.includes(recruiting.id) }, recruiting));
}

export async function joinOfficialRecruiting(recruitingId: string): Promise<void> {
  await keepId(JOINED, recruitingId);
}

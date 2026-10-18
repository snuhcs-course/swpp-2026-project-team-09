/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { FRAMED_PARTS, NAME_POOL } from '@/api/mock/data/quest-parts';
import type { MemberFace } from '@/api/quest-parts-types';
import type { Person, Quest } from '@/api/types';
import type { QuestSummary } from '@/api/waiting-types';
import type { Build } from './build';
import { stableHash } from './stable-pick';

// The mock adapter for the members' names and faces. A Quest names its Holders; a summary names only its Leader, so the
// mock build invents the rest, and the server build adds nobody: a real member is never shown beside an invented one
// (P06 spec, Mocks). Replaced once a summary carries its members.

const MOST_FACES = 3;

function faceOf({ name }: Pick<Person, 'name'>): MemberFace {
  return { name, photo: null };
}

// The Leader and the first other Holders.
export function facesOfQuest({ leader, holders }: Quest): MemberFace[] {
  const others = holders.filter(({ id }) => id !== leader?.id);
  return [...(leader === null ? [] : [leader]), ...others].slice(0, MOST_FACES).map((person) => faceOf(person));
}

// Where the frame's names for a summary start: a post of `boards.ts` after the three recommended, as the frame counts
// them, else by the id.
function poolStart(id: string): number {
  const post = /^post-(\d+)$/u.exec(id);
  return post === null ? stableHash(id) : Math.max(Number(post[1]) - 3, 0);
}

// Names of the frame's for as many other Holders as the summary counts, up to the faces shown.
function inventedCompanions({ id, holderCount }: QuestSummary): MemberFace[] {
  const start = poolStart(id);
  return Array.from({ length: Math.max(Math.min(holderCount, MOST_FACES) - 1, 0) }, (_, index) =>
    faceOf({ name: NAME_POOL[(start + index + 1) % NAME_POOL.length] ?? '' }),
  );
}

// The Leader, and in the mock build the companions: the frame's for a Quest of the mock's, else invented ones.
export function facesOfSummary(summary: QuestSummary, build: Build): MemberFace[] {
  if (build === 'server') {
    return [faceOf(summary.leader)];
  }
  const companions = FRAMED_PARTS[summary.id]?.companions ?? inventedCompanions(summary);
  return [faceOf(summary.leader), ...companions].slice(0, MOST_FACES);
}

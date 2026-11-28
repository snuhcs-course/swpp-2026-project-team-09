/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { MemberFace } from '@/api/quest-parts-types';

// The app's own: the members of the `Party` frame's posts, which no answer of the main server holds.
// `../../quest-parts/` adds them to the client's answers.

// The frame's names for the members a post's summary does not name, after its Leader.
export const NAME_POOL = [
  '서하린',
  '강민재',
  '이도현',
  '박소율',
  '정우진',
  '류시우',
  '진아영',
  '모수빈',
  '채이든',
  '함지율',
];

function face(name: string): MemberFace {
  return { name, photo: null };
}

// The members the frame draws for one Quest of the mock's after its Leader, by its id: the posts of `./boards.ts` and
// the invitation of `./waiting.ts`.
export const FRAMED_COMPANIONS: Readonly<Record<string, MemberFace[]>> = {
  'post-0': [face('서하린'), face('강민재')],
  'post-1': [face('이도현')],
  'post-2': [face('박소율'), face('정우진')],
  'q-report': [],
};

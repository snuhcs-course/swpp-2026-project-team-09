/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
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

// When an invitation's Quest meets: days after today, and a time of Korea's clock.
export interface InvitationTimeParts {
  daysAhead: number;
  hour: number;
  minute: number;
}

// The `PartyInvites` frame's plan for the invitation of `./waiting.ts`: 토 14:00 at the library, two days after the
// frame's Thursday.
export const FRAMED_INVITATION_TIMES: Readonly<Record<string, InvitationTimeParts>> = {
  'q-report': { daysAhead: 2, hour: 14, minute: 0 },
};
export const FRAMED_INVITATION_PLACES: Readonly<Record<string, string>> = { 'q-report': '중앙도서관 (62동)' };

// The sets any other invitation's time and place are picked from, by its Quest's id.
export const INVITATION_TIME_SET: readonly InvitationTimeParts[] = [
  { daysAhead: 1, hour: 12, minute: 10 },
  { daysAhead: 2, hour: 14, minute: 0 },
  { daysAhead: 3, hour: 19, minute: 0 },
  { daysAhead: 5, hour: 18, minute: 30 },
];
export const INVITATION_PLACE_SET: readonly string[] = [
  '학생회관 (63동) 식당',
  '중앙도서관 (62동)',
  '301동 앞',
  '버들골 (100동) 입구',
];

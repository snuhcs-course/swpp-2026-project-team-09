/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { isRefusal } from '@/api/errors';

// The make request refused beside a Quest already set (P04 ticket 17), worded as what it is, never as a failure to
// try again: the Quest became shared with others since the answer came, or a meeting already set, the User's or a
// Friend's, refused a second one. Null for any other refusal.
export function setRefusalWords(error: unknown): string | null {
  if (isRefusal(error, 409, 'MEAL_ALREADY_SET')) {
    return '같이 정한 약속이라 그 파티에서 바꿔 주세요';
  }
  if (isRefusal(error, 409, 'PLAN_ALREADY_SET')) {
    return '이미 정한 약속이 있어요. 그 파티에서 확인해 주세요';
  }
  return isRefusal(error, 409, 'PLAN_SET_BY_FRIEND')
    ? '친구가 이미 정한 약속이 있어요. 그 파티에서 확인해 주세요'
    : null;
}

// A meeting's 바꾸기 refused for good (PR 442's review): its people are no longer the Plan's, or the User no longer
// leads it. It is changed in its 파티, never tried again here.
export const NOT_HERE = '이 약속은 여기서 바꿀 수 없어요. 파티에서 바꿔 주세요';

export function refusedHere(error: unknown): boolean {
  return isRefusal(error, 400, 'PLAN_PEOPLE_CHANGED') || isRefusal(error, 403, 'NOT_QUEST_LEADER');
}

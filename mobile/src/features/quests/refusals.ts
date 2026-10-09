/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { ApiError } from '@/api/errors';

// The words for the main server's refusals in 파티, by their code: one table, which the screens of 파티 and 행사 add
// to.
const WORDS: Readonly<Record<string, string>> = {
  QUEST_ENDED: '일정이 모두 끝난 파티는 활성화할 수 없어요',
  ALREADY_IN_PARTY: '이미 다른 활성화에 참여 중이에요',
  PARTY_FULL: '활성화 자리가 다 찼어요',
  PARTY_NOT_FOUND: '활성화가 끝났어요',
  NOT_PARTY_LEADER: '활성화를 켠 사람만 끌 수 있어요',
  NOT_IN_PARTY: '활성화가 끝났어요',
  LAST_SUB_QUEST: '일정이 하나뿐이라 삭제할 수 없어요',
  ATTENDING_SUB_QUEST: '행사 일정은 바꿀 수 없어요',
  PLACE_NOT_FOUND: '장소를 다시 골라 주세요',
  SUB_QUEST_NOT_FOUND: '이미 삭제된 일정이에요',
  NOT_QUEST_LEADER: '파티장만 할 수 있어요',
  QUEST_FULL: '자리가 다 찼어요',
  QUEST_INVITATION_NOT_FOUND: '이미 끝난 초대예요',
  SHARED_QUEST_HELD: '이 행사에 함께 가는 파티가 이미 있어요',
  ALREADY_HOLDER: '이미 참여 중인 파티예요',
  QUEST_NOT_FOUND: '파티를 찾을 수 없어요',
  QUEST_NOT_OPEN: '참여 방식이 바뀌었어요. 다시 확인해 주세요',
  QUEST_NOT_APPROVAL: '참여 방식이 바뀌었어요. 다시 확인해 주세요',
  QUEST_JOIN_REQUEST_ALREADY_SENT: '이미 참여를 신청했어요',
  QUEST_JOIN_REQUEST_NOT_FOUND: '이미 끝난 신청이에요',
  CAPACITY_BELOW_HOLDERS: '지금 멤버 수보다 적게 정할 수 없어요',
  BOARD_REQUIRED: '게시판을 골라 주세요',
  GLOBAL_EVENT_STARTED: '이미 시작한 행사예요',
  GLOBAL_EVENT_NOT_FOUND: '행사를 찾을 수 없어요',
  MATCHING_REQUEST_WAITING: '이미 매칭 중이에요',
  MATCHING_REQUEST_NOT_WAITING: '이미 매칭이 끝났어요',
  MATCHING_REQUEST_NOT_FOUND: '이미 매칭이 끝났어요',
};

// Where the User enters a Quest, by joining, asking or accepting, an ended Quest is the Quest's, not its Party's.
export const ENTERING: Readonly<Record<string, string>> = { QUEST_ENDED: '이미 끝난 파티예요' };

// Any other refusal, and no answer.
export const NOT_DONE = '요청하지 못했어요. 다시 시도해 주세요';

// `words` go before the table, and `otherwise` stands for any other refusal.
export function refusalWords(
  error: unknown,
  words: Readonly<Record<string, string>> = {},
  otherwise = NOT_DONE,
): string {
  const code = error instanceof ApiError ? error.code : null;
  return (code === null ? undefined : (words[code] ?? WORDS[code])) ?? otherwise;
}

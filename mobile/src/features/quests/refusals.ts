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
};

// Any other refusal, and no answer.
export const NOT_DONE = '요청하지 못했어요. 다시 시도해 주세요';

export function refusalWords(error: unknown): string {
  const code = error instanceof ApiError ? error.code : null;
  return (code === null ? undefined : WORDS[code]) ?? NOT_DONE;
}

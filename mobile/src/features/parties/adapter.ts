// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-08, prompted by AhnJinYoung and fyoon46
import type { MyParty } from '@/api/types';

// The main screen's "활성 파티": the Party the User is in now.
export interface ActivePartyView {
  id: string;
  // "AI 커리어 설명회 같이 가요"
  title: string;
  // "3명 공유 중": the members who share their position with the User, the User left out. "응답 대기" when nobody
  // else shares.
  line: string;
}

// Null for a User who is in no Party.
export function toActiveParty(myParty: MyParty | null | undefined, meId: string): ActivePartyView | null {
  if (myParty === null || myParty === undefined) {
    return null;
  }
  const sharing = myParty.members.filter(({ id, visible }) => id !== meId && visible).length;
  return { id: myParty.id, title: myParty.title, line: sharing > 0 ? `${sharing}명 공유 중` : '응답 대기' };
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { MyParty } from '@/api/types';

// The main screen's "활성 파티": the Party the User is in now.
export interface ActivePartyView {
  id: string;
  // "AI 커리어 설명회 같이 가요"
  title: string;
  // "3명 공유 중": the members who share their position with the User, and the User once they share in it, as the
  // room counts them (P06 ticket 30). "응답 대기" when nobody else shares.
  line: string;
}

// Null for a User who is in no Party. `masterOn`: the Master Switch, without which the User shares in no Party.
export function toActiveParty(
  myParty: MyParty | null | undefined,
  meId: string,
  masterOn: boolean,
): ActivePartyView | null {
  if (myParty === null || myParty === undefined) {
    return null;
  }
  const others = myParty.members.filter(({ id, visible }) => id !== meId && visible).length;
  const me = masterOn && myParty.sharing ? 1 : 0;
  return { id: myParty.id, title: myParty.title, line: others > 0 ? `${others + me}명 공유 중` : '응답 대기' };
}

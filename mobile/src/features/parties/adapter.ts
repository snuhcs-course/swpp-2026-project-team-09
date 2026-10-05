import type { MyParty, PartyNews } from '@/api/types';

// The number on the bottom navigation's 파티. Nothing waiting shows no badge.
export function toPartyBadge(news: PartyNews | undefined): number {
  return Math.max(0, Math.trunc(news?.count ?? 0));
}

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

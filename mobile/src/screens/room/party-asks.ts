/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { OtherParty } from '@/features/quests/room-adapter';
import type { Ask } from './confirm-sheet';

// The questions before entering, opening or leaving an activation, wherever it is entered: the room, 알림's 파티 켜기,
// 내 파티's strip and the map's 활성 파티 (P06 ticket 19 moved them here from the room's activation box).

// The question before leaving the 활성화, also asked from the map for a Party tied to no Quest.
export function leaveAsk(onConfirm: () => void): Ask {
  return {
    title: '활성화에서 나갈까요?',
    body: '내 위치 공유가 멈추고 멤버 위치도 볼 수 없어요.\n파티에는 그대로 남아요.',
    confirm: '나가기',
    danger: true,
    onConfirm,
  };
}

// The frame's words for the other Party: the User leaves it, or ends the one the User switched on (leads).
function switchLine(otherParty: OtherParty | null): string {
  if (otherParty === null) {
    return '';
  }
  const { title, leads } = otherParty;
  return `\n한 번에 한 파티에만 참여할 수 있어요. ${
    leads ? `내가 켠 ‘${title}’ 활성화는 꺼져요.` : `지금 참여 중인 ‘${title}’ 활성화에서는 나가게 돼요.`
  }`;
}

// How the User gets out of the other Party first: `end` for one the User leads, as the sheet says.
export function leavingOf(otherParty: OtherParty | null): boolean | 'end' {
  if (otherParty === null) {
    return false;
  }
  return otherParty.leads ? 'end' : true;
}

// The question before entering a Party while the User is in another.
export function joinAsk(title: string, otherParty: OtherParty, onConfirm: () => void): Ask {
  return {
    title: `‘${title}’ 활성화에 참여할까요?`,
    body: `참여한 멤버끼리 서로 위치를 볼 수 있어요.${switchLine(otherParty)}`,
    confirm: '나가고 참여',
    danger: false,
    onConfirm,
  };
}

// The question before opening the Quest's Party, `others` being its other Holders, whom opening rings (P06 ticket 21).
export function openAsk(others: number, otherParty: OtherParty | null, onConfirm: () => void): Ask {
  const notice = others > 0 ? `멤버 ${String(others)}명에게 알림이 가요. ` : '';
  return {
    title: '파티를 활성화할까요?',
    body: `${notice}수락한 멤버끼리만 서로 위치를 볼 수 있어요.${switchLine(otherParty)}`,
    confirm: '활성화',
    danger: false,
    onConfirm,
  };
}

// The one question before opening or entering while the Master Switch is off, nobody seeing the User until it is on.
// Its confirm turns it on and goes on at once.
export function masterAsk(opening: boolean, otherParty: OtherParty | null, onConfirm: () => void): Ask {
  return {
    title: '전체 위치 공유를 켤까요?',
    body: `전체 위치 공유가 꺼져 있으면 활성화에 참여해도 서로의 위치가 보이지 않아요. 켜면 바로 활성화에 참여해요.${switchLine(otherParty)}`,
    confirm: opening ? '켜고 활성화' : '켜고 참여',
    danger: false,
    onConfirm,
  };
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef } from 'react';
import type { StudyGroup } from '@/api/study-plan-types';
import { useLibrarySession } from '@/library/library-session';
import type { TellAct } from '../library/act-stage';
import type { PartyRequest } from '../library/room-party';
import { isWaiting } from './study-group-booking';
import { isBooked, isOut } from './study-group-request';

// The study answer together's main button beside the input (P10 tickets 11 and 12), told as a booking ticket's is:
// - before the request: "+ 같이" while people are missing, 로그인 while logged out of the library, else "동의 요청 보내기";
// - while it is sent: "보내는 중이에요";
// - while it is out: "모두 동의하면 예약", dimmed, or "+ 같이 한 명 더" once a Friend is out, and "예약하기" once all
//   have consented, which ticket 14 books.

const TELLER = 'study-group';

type Main =
  'add' | 'logIn' | 'send' | 'sending' | 'waiting' | 'ready' | 'logInBook' | 'wait' | 'again' | 'booked' | 'askMore';

interface Seen {
  main: Main;
  words: string;
  disabled: boolean;
}

// Once everyone has consented (P10 ticket 14): 예약하기, "로그인하고 예약" logged out, the booking window's wait, or
// asking again at the next free time when the kind has no free room (`again`, the button's words); once booked from
// this phone, "예약했어요" dimmed, though the server may still say ready.
function readyMain(group: StudyGroup, loggedIn: boolean, again: string | null, booked: boolean): Seen {
  if (booked) {
    return { main: 'booked', words: '예약했어요', disabled: true };
  }
  if (isWaiting(group)) {
    return { main: 'wait', words: '예약 창이 열리면 알려 드려요', disabled: true };
  }
  if (again !== null) {
    return { main: 'again', words: again, disabled: false };
  }
  return loggedIn
    ? { main: 'ready', words: '예약하기', disabled: false }
    : { main: 'logInBook', words: '로그인하고 예약', disabled: false };
}

// `group` is the one on screen: while the request is out, its people those still in.
export function mainOf(
  group: StudyGroup,
  loggedIn: boolean,
  party: PartyRequest,
  again: string | null = null,
  booked = false,
): Seen {
  const { request } = party;
  if (isBooked(request)) {
    return { main: 'booked', words: '예약했어요', disabled: true };
  }
  if (isOut(request)) {
    if ((request.moreNeeded ?? 0) > 0) {
      return { main: 'askMore', words: '+ 같이 한 명 더', disabled: false };
    }
    return request.status === 'ready'
      ? readyMain(group, loggedIn, again, booked)
      : { main: 'waiting', words: '모두 동의하면 예약', disabled: true };
  }
  if (party.sending) {
    return { main: 'sending', words: '보내는 중이에요', disabled: true };
  }
  if (group.moreNeeded > 0) {
    return { main: 'add', words: group.moreNeeded === 1 ? '+ 같이 한 명 더' : '+ 같이', disabled: false };
  }
  if (!loggedIn) {
    return { main: 'logIn', words: '로그인', disabled: false };
  }
  return { main: 'send', words: '동의 요청 보내기', disabled: party.send === null };
}

export interface GroupAct {
  group: StudyGroup;
  loggedIn: boolean;
  party: PartyRequest;
  busy: boolean;
  // Opens the Friends to pick in the time card.
  onAdd: () => void;
  // Opens the picker of one more Friend for the request out.
  onAsk: () => void;
  // Once everyone has consented (P10 ticket 14): books the room, or asks again at the next free time; `again` is that
  // button's words, null while the kind has a free room. `booking` dims 예약하기 while the room or the use is missing,
  // or while it books.
  onBook?: () => void;
  onLoggedIn?: () => void;
  onAgain?: () => void;
  booked?: boolean;
  again?: string | null;
  booking?: boolean;
  act?: TellAct;
  bubbleId?: number;
}

// Its words are told when they change, and its press reads the card's latest functions, so that telling it costs no
// render.
export function useGroupAct(props: GroupAct): void {
  const { group, loggedIn, party, busy, act, bubbleId, again = null, booking = false, booked = false } = props;
  const { logIn } = useLibrarySession();
  const handlers = { ...props, logIn, send: party.send };
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  const seen = mainOf(group, loggedIn, party, again, booked);
  const { main, words } = seen;
  const disabled = busy || seen.disabled || (main === 'ready' && booking);
  useEffect(() => {
    if (act === undefined || bubbleId === undefined) {
      return;
    }
    const onPress = (): void => {
      const now = latest.current;
      if (main === 'add') {
        now.onAdd();
      } else if (main === 'askMore') {
        now.onAsk();
      } else if (main === 'logIn') {
        void now.logIn().catch(() => null);
      } else if (main === 'send') {
        now.send?.();
      } else if (main === 'ready') {
        now.onBook?.();
      } else if (main === 'logInBook') {
        void now
          .logIn()
          .then(() => now.onLoggedIn?.())
          .catch(() => null);
      } else if (main === 'again') {
        now.onAgain?.();
      }
    };
    act(TELLER, bubbleId, { words, onPress, disabled, danger: false });
  }, [act, bubbleId, main, words, disabled]);
  useEffect(
    () => (): void => {
      if (act !== undefined && bubbleId !== undefined) {
        act(TELLER, bubbleId, null);
      }
    },
    [act, bubbleId],
  );
}

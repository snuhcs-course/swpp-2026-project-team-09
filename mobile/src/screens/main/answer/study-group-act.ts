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
import { isOut } from './study-group-request';

// The study answer together's main button beside the input (P10 tickets 11 and 12), told as a booking ticket's is:
// - before the request: "+ 같이" while people are missing, 로그인 while logged out of the library, else "동의 요청 보내기";
// - while it is sent: "보내는 중이에요";
// - while it is out: "모두 동의하면 예약", dimmed, or "+ 같이 한 명 더" once a Friend is out, and "예약하기" once all
//   have consented, which ticket 14 books.

const TELLER = 'study-group';

type Main = 'add' | 'logIn' | 'send' | 'sending' | 'waiting' | 'ready' | 'askMore';

interface Seen {
  main: Main;
  words: string;
  disabled: boolean;
}

// `group` is the one on screen: while the request is out, its people those still in.
export function mainOf(group: StudyGroup, loggedIn: boolean, party: PartyRequest): Seen {
  const { request } = party;
  if (isOut(request)) {
    if ((request.moreNeeded ?? 0) > 0) {
      return { main: 'askMore', words: '+ 같이 한 명 더', disabled: false };
    }
    return request.status === 'ready'
      ? { main: 'ready', words: '예약하기', disabled: true }
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
  act?: TellAct;
  bubbleId?: number;
}

// Its words are told when they change, and its press reads the card's latest functions, so that telling it costs no
// render.
export function useGroupAct({ group, loggedIn, party, busy, onAdd, onAsk, act, bubbleId }: GroupAct): void {
  const { logIn } = useLibrarySession();
  const latest = useRef({ onAdd, onAsk, logIn, send: party.send });
  useEffect(() => {
    latest.current = { onAdd, onAsk, logIn, send: party.send };
  });
  const seen = mainOf(group, loggedIn, party);
  const { main, words } = seen;
  const disabled = busy || seen.disabled;
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

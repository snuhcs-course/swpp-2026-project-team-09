/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import { library } from '@/library/library';
import type { LibraryBooking } from '@/library/replies';
import { reportRoomCancelled } from '@/library/room-bookings';
import { endSeatStay } from '@/library/seat-stays';
import { libraryMessage, type PendingMark, useWrite, type Write } from './use-library-call';

// The words and the confirm of a cancel or a return, which a cancel or a return card and a row of 내 예약 share.

export type Act = 'cancel' | 'return';

// No seat or room booked or in use: what a return card and 내 예약 say (P01 ticket 15).
export const NOTHING_HELD = '지금 예약이나 사용 중인 자리가 없어요.';

// A return card that found a seat booked, not yet confirmed at the 좌석배정기, which is cancelled instead.
export const NOT_YET_USED = '아직 쓰기 전이라 반납 대신 예약을 취소할 수 있어요.';

// How a ticket reads once its booking ended here.
export const ENDED_WORDS: Record<Act, string> = { cancel: '취소됨', return: '반납함' };

// The ✕ of an armed cancel or return, for a screen reader: it does not do it (P01 ticket 21).
export const BACK_WORDS: Record<Act, string> = { cancel: '취소하지 않기', return: '반납하지 않기' };

export const ACT_WORDS: Record<Act, { confirm: string; done: string; none: string; failed: string }> = {
  cancel: {
    confirm: '예약 취소',
    done: '예약을 취소했어요.',
    none: '취소할 예약이 없어요.',
    failed: '취소하지 못했어요',
  },
  return: {
    confirm: '반납하기',
    done: '반납했어요. 이용해 주셔서 고마워요!',
    none: NOTHING_HELD,
    failed: '반납하지 못했어요',
  },
};

// What a cancel or a return sends: the booking's number alone, which the done message also holds (P01 ticket 15).
export type Acted = Pick<LibraryBooking, 'BSEQNO'>;

export type Outcome = 'idle' | 'done' | 'stopped';
export type Ended = Exclude<Outcome, 'idle'>;

// The confirm of a cancel or a return: setCancelBooking with the booking's number, then what happened. A write that
// fails is never sent again by itself: the card reads the bookings again to show where they stand.
export function useConfirming(
  act: Act,
  reload: () => void,
  // 내 예약 reads its list again, so that the row shows its new STATUS_NAME; a cancel or a return card tells the chat
  // how it ended, which keeps it so when the sheet opens anew.
  {
    reloadAfter = false,
    onEnd = (): void => undefined,
    mark = null,
  }: { reloadAfter?: boolean; onEnd?: (outcome: Ended) => void; mark?: PendingMark | null } = {},
): { outcome: Outcome; setOutcome: (outcome: Ended) => void; write: Write<Acted> } {
  const [outcome, setShown] = useState<Outcome>('idle');
  const setOutcome = (next: Ended): void => {
    setShown(next);
    onEnd(next);
  };
  const write = useWrite<Acted>(
    async (booking, press) => {
      const result = await library.cancel(booking.BSEQNO, press);
      if (result.successYN === 'N') {
        const message = libraryMessage(result);
        reload();
        return {
          failure: null,
          message: message === '' ? ACT_WORDS[act].failed : `${ACT_WORDS[act].failed}: ${message}`,
        };
      }
      // A room booked through a room request: the server is told, so that its booking party stops blocking the day; a
      // seat's stay ends with it (P05-14).
      await reportRoomCancelled(booking.BSEQNO);
      await endSeatStay(booking.BSEQNO);
      setOutcome('done');
      if (reloadAfter) {
        reload();
      }
      return null;
    },
    (kind) => {
      if (kind === 'network') {
        reload();
      }
    },
    mark,
  );
  return { outcome, setOutcome, write };
}

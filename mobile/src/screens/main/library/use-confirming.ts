/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useState } from 'react';
import { library } from '@/library/library';
import type { LibraryBooking } from '@/library/replies';
import { libraryMessage, useWrite, type Write } from './use-library-call';

// The words and the confirm of a cancel or a return, which a cancel or a return card and a row of 내 예약 share.

export type Act = 'cancel' | 'return';

export const ACT_WORDS: Record<Act, { confirm: string; done: string; none: string; failed: string }> = {
  cancel: { confirm: '취소하기', done: '예약을 취소했어요', none: '취소할 예약이 없어요', failed: '취소하지 못했어요' },
  return: {
    confirm: '반납하기',
    done: '반납했어요. 이용해 주셔서 고마워요!',
    none: '지금 사용 중인 좌석이 없어요',
    failed: '반납하지 못했어요',
  },
};

export type Outcome = 'idle' | 'done' | 'stopped';

// The confirm of a cancel or a return: setCancelBooking with the booking's number, then what happened. A write that
// fails is never sent again by itself: the card reads the bookings again to show where they stand.
export function useConfirming(
  act: Act,
  reload: () => void,
  // 내 예약 reads its list again, so that the row shows its new STATUS_NAME.
  { reloadAfter = false } = {},
): { outcome: Outcome; setOutcome: (outcome: Outcome) => void; write: Write<LibraryBooking> } {
  const [outcome, setOutcome] = useState<Outcome>('idle');
  const write = useWrite<LibraryBooking>(
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
  );
  return { outcome, setOutcome, write };
}

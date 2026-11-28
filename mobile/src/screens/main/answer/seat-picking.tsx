/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactNode, useState } from 'react';
import type { LibrarySpace } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { myUserId } from '@/auth/sign-in';
import type { Frame } from '@/features/assistant/answer-frame';
import { toggled } from '@/features/assistant/people-picking';
import { seatTogetherInput } from '@/features/assistant/seat-together';
import type { Chat } from '@/features/assistant/use-chat';
import { AddChip } from './condition-chips';
import type { Picking } from './person-rows';
import { type PickSource, usePickingBar } from './pick-head';
import { addNameOf } from './who-words';

const SEAT_TOGETHER = '같이 공부할 자리';
const SEAT_ADD = addNameOf('study') ?? '같이 공부할 친구 추가';

// The answers' picker on the seat card, whose picking the card keeps itself, since it has no answer. 완료 with Friends
// asks the study answer together for the span the bar shows, which takes the card's place as the app's own turn; every
// Friend taken out of that answer takes the turn back, which shows the card again (`fromCard`).
function useSeatPicking(seat: LibrarySpace, askApp: Chat['askApp']): PickSource {
  const [picked, setPicked] = useState<readonly string[] | null>(null);
  const [pickOrder, setPickOrder] = useState<readonly string[] | null>(null);
  const setAdding = (open: boolean): void => {
    setPicked(open ? [] : null);
    setPickOrder(null);
  };
  return {
    picked,
    asked: null,
    ready: true,
    pickOrder,
    keepPickOrder: (order) => {
      setPickOrder((last) => last ?? order);
    },
    pick: (userId) => {
      setPicked((last) => toggled(last ?? [], userId));
    },
    setAdding,
    finish: (shown) => {
      const friends = picked ?? [];
      setAdding(false);
      if (friends.length === 0) {
        return;
      }
      const input = seatTogetherInput(shown, seat, [myUserId(), ...friends]);
      void askApp(SEAT_TOGETHER, () => apiClient.recalculateAnswer(input, null), true);
    },
  };
}

// "＋ 같이" on the seat answer alone (P10 ticket 15): the time card's own chip, picker and head, as a meal's. While the
// conversation waits, for that answer or another, neither the chip nor 완료 asks again.
export function useSeatTogether(
  seat: LibrarySpace,
  band: Frame['band'],
  chat: Pick<Chat, 'askApp' | 'waiting'>,
): { band: Frame['band']; picking: Picking | null; add: ReactNode } {
  const source = useSeatPicking(seat, chat.askApp);
  const busy = chat.waiting;
  const bar = usePickingBar(source, { band, parts: [], place: null }, { busy });
  return {
    band: bar.band,
    picking: bar.picking,
    add: bar.head ?? (
      <AddChip
        disabled={busy}
        inBar
        name={SEAT_ADD}
        onAdd={() => {
          source.setAdding(true);
        }}
      />
    ),
  };
}

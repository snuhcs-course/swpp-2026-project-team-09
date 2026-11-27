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
import { keepSeatCard, seatTogetherInput } from '@/features/assistant/seat-together';
import type { Chat } from '@/features/assistant/use-chat';
import type { Slot } from '@/library/cards/payloads';
import { AddChip } from './condition-chips';
import type { Picking } from './person-rows';
import { type PickSource, usePickingBar } from './pick-head';
import { addNameOf } from './who-words';

const SEAT_TOGETHER = '같이 공부할 자리';
const SEAT_ADD = addNameOf('study') ?? '같이 공부할 친구 추가';

// The answers' picker on the seat card, whose picking the card keeps itself, since it has no answer. 완료 with Friends
// asks the study answer together for the card's day and time, which takes the card's place; the card is kept, and
// shown again once every Friend is taken out of that answer (`backToSeatCard`).
function useSeatPicking(slot: Slot, seat: LibrarySpace, askApp: Chat['askApp']): PickSource {
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
    finish: () => {
      const friends = picked ?? [];
      setAdding(false);
      if (friends.length === 0) {
        return;
      }
      const input = seatTogetherInput(slot, seat, [myUserId(), ...friends]);
      void askApp(
        SEAT_TOGETHER,
        () => apiClient.recalculateAnswer(input, null),
        (answer, back) => {
          keepSeatCard(answer, back);
        },
      );
    },
  };
}

// "＋ 같이" on the seat answer alone (P10 ticket 15): the time card's own chip, picker and head, as a meal's.
export function useSeatTogether(
  slot: Slot,
  seat: LibrarySpace,
  band: Frame['band'],
  askApp: Chat['askApp'],
): { band: Frame['band']; picking: Picking | null; add: ReactNode } {
  const source = useSeatPicking(slot, seat, askApp);
  const bar = usePickingBar(source, { band, parts: [], place: null }, { busy: false });
  return {
    band: bar.band,
    picking: bar.picking,
    add: bar.head ?? (
      <AddChip
        disabled={false}
        inBar
        name={SEAT_ADD}
        onAdd={() => {
          source.setAdding(true);
        }}
      />
    ),
  };
}

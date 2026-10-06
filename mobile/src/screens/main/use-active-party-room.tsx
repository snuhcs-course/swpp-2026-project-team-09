import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { myPartyQuery } from '@/api/queries';
import { leaveAsk } from '@/screens/room/activation-box';
import { type Ask, ConfirmSheet } from '@/screens/room/confirm-sheet';
import { useRoomActions } from '@/screens/room/use-room-actions';

export interface ActivePartyRoom {
  // Opens the room of the Quest of the User's Party, or asks to leave a Party tied to no Quest, which has no room.
  open: () => void;
  // The question, drawn by the screen.
  sheet: ReactElement;
}

// What "활성 파티" and a Party member's card "파티 열기" do.
export function useActivePartyRoom(): ActivePartyRoom {
  const myParty = useQuery(myPartyQuery).data ?? null;
  const actions = useRoomActions();
  const [ask, setAsk] = useState<Ask | null>(null);
  return {
    open: () => {
      if (myParty === null) {
        return;
      }
      if (myParty.quest === null) {
        setAsk(leaveAsk(() => void actions.leaveParty()));
      } else {
        router.push(`/room/${myParty.quest.id}`);
      }
    },
    sheet: (
      <ConfirmSheet
        ask={ask}
        label="확인"
        onClose={() => {
          setAsk(null);
        }}
      />
    ),
  };
}

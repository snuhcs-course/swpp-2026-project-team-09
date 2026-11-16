/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { myPartyQuery, questsQuery } from '@/api/queries';
import { myUserId } from '@/auth/sign-in';
import { Button } from '@/design-system';
import { heldAlone } from '@/features/quests/adapter';
import { otherPartyOf } from '@/features/quests/room-adapter';
import { useMasterSwitch } from '@/features/sharing/use-master-switch';
import { leavingOf, openAsk } from '../room/activation-box';
import { type Ask, ConfirmSheet } from '../room/confirm-sheet';
import { useRoomActions } from '../room/use-room-actions';

// `파티 켜기` on the time to leave: opens the Quest's Party as the room's `파티 활성화` does, at once, or after the
// room's question when the User must leave another Party for it. None while the User is in the Quest's Party, while
// that is not known, or for a Quest taken alone, whose Party would show it to Friends.
export function PartyOnButton({ questId }: { questId: string }): ReactElement | null {
  const myParty = useQuery(myPartyQuery).data;
  const quest = useQuery(questsQuery).data?.find(({ id }) => id === questId);
  const masterSwitch = useMasterSwitch().on;
  const actions = useRoomActions();
  const [ask, setAsk] = useState<Ask | null>(null);
  if (myParty === undefined || quest === undefined || heldAlone(quest) || myParty?.quest?.id === questId) {
    return null;
  }
  const others = quest.holders.length - 1;
  const otherParty = otherPartyOf(myParty, false, myUserId());
  const open = (): void => {
    void actions.openParty(quest, others, leavingOf(otherParty));
  };
  return (
    <>
      <Button
        onPress={() => {
          if (otherParty === null) {
            open();
          } else {
            setAsk(openAsk(others, otherParty, masterSwitch, open));
          }
        }}
        variant="secondary"
      >
        파티 켜기
      </Button>
      <ConfirmSheet
        ask={ask}
        label="확인"
        onClose={() => {
          setAsk(null);
        }}
      />
    </>
  );
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { myPartyQuery, questsQuery } from '@/api/queries';
import { myUserId } from '@/auth/sign-in';
import { Button } from '@/design-system';
import { heldAlone } from '@/features/quests/adapter';
import { otherPartyOf } from '@/features/quests/room-adapter';
import { type Ask, ConfirmSheet } from '../room/confirm-sheet';
import { usePartyEntry } from '../room/use-party-entry';

// `파티 켜기` on the time to leave: opens the Quest's Party as the room's `파티 활성화` does (`usePartyEntry`): at once,
// after the room's question when the User must leave another Party for it, or after '전체 위치 공유를 켤까요?' while the
// Master Switch is off. None while the User is in the Quest's Party, while that is not known, or for a Quest taken
// alone, whose Party would show it to Friends.
export function PartyOnButton({ questId }: { questId: string }): ReactElement | null {
  const myParty = useQuery(myPartyQuery).data;
  const quest = useQuery(questsQuery).data?.find(({ id }) => id === questId);
  const [ask, setAsk] = useState<Ask | null>(null);
  const entry = usePartyEntry(setAsk);
  if (myParty === undefined || quest === undefined || heldAlone(quest) || myParty?.quest?.id === questId) {
    return null;
  }
  const otherParty = otherPartyOf(myParty, false, myUserId());
  return (
    <>
      <Button
        onPress={() => {
          entry.open(quest, otherParty, false);
        }}
        variant="secondary"
      >
        파티 켜기
      </Button>
      {entry.explanation}
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

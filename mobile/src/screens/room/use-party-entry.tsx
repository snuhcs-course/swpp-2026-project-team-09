/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { Quest } from '@/api/types';
import type { OtherParty } from '@/features/quests/room-adapter';
import { useMasterSwitch } from '@/features/sharing/use-master-switch';
import { LocationExplanation } from '../main/location-explanation';
import { type SharingSwitch, useSharingSwitch } from '../me/use-sharing-switch';
import type { Ask } from './confirm-sheet';
import { joinAsk, leavingOf, masterAsk, openAsk } from './party-asks';
import { type RoomActions, useRoomActions } from './use-room-actions';

export interface PartyEntry {
  // `파티 활성화`: `openAsk` first beside another Party, and always where `asks` (the room).
  open: (quest: Quest, otherParty: OtherParty | null, asks: boolean) => void;
  // `참여`: at once, or `joinAsk` first beside another Party.
  join: (partyId: string, title: string, otherParty: OtherParty | null) => void;
  // `위치 공유 켜고 참여` of a member nobody sees: turns on whichever switch is off, the Master Switch first.
  shareAgain: (switchOn: boolean) => void;
  // The explanation before the location prompt, which the screen draws.
  explanation: ReactElement;
}

// `위치 공유 켜고 참여`: the Master Switch first, then the Party switch where it is off.
function shareAgainWith(actions: RoomActions, sharing: SharingSwitch, masterOff: boolean): PartyEntry['shareAgain'] {
  return (switchOn) => {
    const partySwitch = (): void => {
      if (!switchOn) {
        void actions.setSharing(true);
      }
    };
    if (masterOff) {
      sharing.change(true, partySwitch);
    } else {
      partySwitch();
    }
  };
}

// The one way into an activation, for the room, 알림's 파티 켜기 and 내 파티's strip (P06 ticket 19). While the Master
// Switch is off nobody sees the User, so opening and entering ask '전체 위치 공유를 켤까요?' instead, whose confirm turns
// it on as 내 정보 does and then goes on with no second question. `onAsk` shows a question in the screen's sheet.
export function usePartyEntry(onAsk: (ask: Ask) => void): PartyEntry {
  const actions = useRoomActions();
  const sharing = useSharingSwitch();
  const masterOff = useMasterSwitch().off;
  const askMaster = (opening: boolean, otherParty: OtherParty | null, go: () => void): void => {
    onAsk(
      masterAsk(opening, otherParty, () => {
        sharing.change(true, go);
      }),
    );
  };
  return {
    open: (quest, otherParty, asks) => {
      const open = (): void => void actions.openParty(quest, leavingOf(otherParty));
      if (masterOff) {
        askMaster(true, otherParty, open);
      } else if (asks || otherParty !== null) {
        onAsk(openAsk(quest.holders.length - 1, otherParty, open));
      } else {
        open();
      }
    },
    join: (partyId, title, otherParty) => {
      const join = (): void => void actions.joinParty(partyId, leavingOf(otherParty));
      if (masterOff) {
        askMaster(false, otherParty, join);
      } else if (otherParty === null) {
        join();
      } else {
        onAsk(joinAsk(title, otherParty, join));
      }
    },
    shareAgain: shareAgainWith(actions, sharing, masterOff),
    explanation: (
      <LocationExplanation
        blocked={sharing.blocked}
        onAllow={sharing.allow}
        onLater={sharing.later}
        visible={sharing.explaining}
      />
    ),
  };
}

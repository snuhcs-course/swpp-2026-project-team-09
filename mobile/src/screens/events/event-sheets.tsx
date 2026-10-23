/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-23  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import type { Quest } from '@/api/types';
import type { RecruitRowView } from '@/features/events/adapter';
import { openPost } from '../party/post-card';
import { RecruitingSheet } from './recruiting-sheet';
import { useOpenPartyCreate } from './use-party-create';

// The sheets an event's card opens, wherever the card is drawn: the 행사 tab, and the Assistant's answers in the chat.
// They were the 행사 tab's own until the chat drew its cards too.

export interface PickedEvent {
  id: string;
  title: string;
}

// The sheet the cards open: 파티 찾기/모집, whose rows open the recruiting posts.
export interface EventSheetsState {
  recruitEvent: PickedEvent | null;
  setRecruitEvent: (event: PickedEvent | null) => void;
  onRow: (row: RecruitRowView) => void;
  onRecruit: (eventId: string) => void;
}

export function useEventSheets(): EventSheetsState {
  const [recruitEvent, setRecruitEvent] = useState<PickedEvent | null>(null);
  const openPartyCreate = useOpenPartyCreate();
  return {
    recruitEvent,
    setRecruitEvent,
    // A Quest the User holds opens its room; another's opens its recruiting post, where the User joins or asks to.
    onRow: (row) => {
      setRecruitEvent(null);
      if (row.held) {
        router.push(`/room/${row.questId}`);
        return;
      }
      openPost(row.questId);
    },
    // A User who holds the event's 파티 with others is led to it; anyone else recruits.
    onRecruit: (eventId) => {
      setRecruitEvent(null);
      openPartyCreate(eventId);
    },
  };
}

export function EventSheets({ sheets, quests }: { sheets: EventSheetsState; quests: readonly Quest[] }): ReactElement {
  return (
    <RecruitingSheet
      event={sheets.recruitEvent}
      onClose={() => {
        sheets.setRecruitEvent(null);
      }}
      onRecruit={sheets.onRecruit}
      onRow={sheets.onRow}
      quests={quests}
    />
  );
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { questsQuery } from '@/api/queries';
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

// The sheets with the User's Quests, for a screen that does not read them itself: the map's event card opens them.
export function useEventSheetsOver(): { open: (event: PickedEvent) => void; sheet: ReactElement } {
  const sheets = useEventSheets();
  const quests = useQuery(questsQuery).data ?? [];
  return { open: sheets.setRecruitEvent, sheet: <EventSheets quests={quests} sheets={sheets} /> };
}

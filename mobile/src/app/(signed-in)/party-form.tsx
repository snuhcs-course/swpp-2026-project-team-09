/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { PartyFormScreen } from '@/screens/party/form/party-form-screen';

// 파티 만들기, above the tabs: `/party-form`, `/party-form?eventId=<id>` with a Global Event chosen,
// `/party-form?friendId=<id>` as 비공개 with a Friend invited, and `/party-form?questId=<id>` for its edit mode.
export default function PartyFormRoute(): ReactElement {
  const { questId, eventId, friendId } = useLocalSearchParams<{
    questId?: string;
    eventId?: string;
    friendId?: string;
  }>();
  return <PartyFormScreen eventId={eventId ?? null} friendId={friendId ?? null} questId={questId ?? null} />;
}

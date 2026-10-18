/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { PartyFormScreen } from '@/screens/party/form/party-form-screen';

// 파티 만들기, above the tabs: `/party-form`, `/party-form?eventId=<id>` with a Global Event chosen,
// `/party-form?friendId=<id>` as 비공개 with a Friend invited, `/party-form?questId=<id>` for its edit mode, and
// `/party-form?fromProposal=1` filled with the chat's Proposal, which `holdProposal` holds.
export default function PartyFormRoute(): ReactElement {
  const { questId, eventId, friendId, fromProposal } = useLocalSearchParams<{
    questId?: string;
    eventId?: string;
    friendId?: string;
    fromProposal?: string;
  }>();
  return (
    <PartyFormScreen
      eventId={eventId ?? null}
      friendId={friendId ?? null}
      fromProposal={fromProposal === '1'}
      questId={questId ?? null}
    />
  );
}

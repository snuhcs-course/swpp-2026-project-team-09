// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by fyoon46
import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { PartyFormScreen } from '@/screens/party/form/party-form-screen';

// 파티 만들기, above the tabs: `/party-form`, `/party-form?eventId=<id>` with a Global Event chosen, and
// `/party-form?questId=<id>` for its edit mode.
export default function PartyFormRoute(): ReactElement {
  const { questId, eventId } = useLocalSearchParams<{ questId?: string; eventId?: string }>();
  return <PartyFormScreen eventId={eventId ?? null} questId={questId ?? null} />;
}

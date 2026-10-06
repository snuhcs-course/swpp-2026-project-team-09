import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { PartyFormScreen } from '@/screens/party/form/party-form-screen';

// 파티 만들기, above the tabs: `/party-form`, and `/party-form?questId=<id>` for its edit mode.
export default function PartyFormRoute(): ReactElement {
  const { questId } = useLocalSearchParams<{ questId?: string }>();
  return <PartyFormScreen questId={questId ?? null} />;
}

// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { type PartyTab, PartyScreen } from '@/screens/party/party-screen';

function isPartyTab(tab: string | undefined): tab is PartyTab {
  return tab === 'find' || tab === 'mine' || tab === 'invites';
}

// The 파티 tab. Its address names the tab inside it: `/party?tab=invites` opens 초대. Without it, 찾기.
export default function PartyRoute(): ReactElement {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return (
    <PartyScreen
      onTab={(next) => {
        router.setParams({ tab: next });
      }}
      tab={isPartyTab(tab) ? tab : 'find'}
    />
  );
}

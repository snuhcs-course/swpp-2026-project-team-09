/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-23  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router, useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { type PartyTab, PartyScreen } from '@/screens/party/party-screen';

function isPartyTab(tab: string | undefined): tab is PartyTab {
  return tab === 'find' || tab === 'mine' || tab === 'invites';
}

// Shows a tab inside the 파티 tab, by its address. One function for every render, so that the tab's swipe is kept.
function showTab(next: PartyTab): void {
  router.setParams({ tab: next });
}

// The 파티 tab. Its address names the tab inside it: `/party?tab=invites` opens 초대. Without it, 찾기.
export default function PartyRoute(): ReactElement {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <PartyScreen onTab={showTab} tab={isPartyTab(tab) ? tab : 'find'} />;
}

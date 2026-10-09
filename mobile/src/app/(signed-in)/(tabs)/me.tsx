/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { router, useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { MeScreen } from '@/screens/me/me-screen';

// The 내 정보 tab. Its address can ask for the 위치 공유 card: `/me?show=sharing`, as the friend panel's "공유 설정"
// opens it. The request is cleared once the card was shown.
export default function MeRoute(): ReactElement {
  const { show } = useLocalSearchParams<{ show?: string }>();
  return (
    <MeScreen
      onSharingShown={() => {
        router.setParams({ show: undefined });
      }}
      showSharing={show === 'sharing'}
    />
  );
}

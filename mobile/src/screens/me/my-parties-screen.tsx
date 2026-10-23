/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { FullScreenPanel } from '@/design-system';
import { useMineList } from '../party/mine-tab';

// 참여 중인 파티, pushed from 내 정보: the 파티 tab's 내 파티 above the tabs, whose back returns to 내 정보.
export function MyPartiesScreen(): ReactElement {
  const { chips, cards, sheet } = useMineList();
  return (
    <>
      <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} title="참여 중인 파티" under={chips}>
        {cards}
      </FullScreenPanel>
      {sheet}
    </>
  );
}

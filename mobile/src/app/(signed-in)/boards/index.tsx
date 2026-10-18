/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { BoardsScreen } from '@/screens/party/boards-screen';

// 전체 파티, above the tabs: `/boards`, at `일반`; `/boards?tab=official` at `공식`.
export default function BoardsRoute(): ReactElement {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <BoardsScreen initialTab={tab === 'official' ? 'official' : 'normal'} />;
}

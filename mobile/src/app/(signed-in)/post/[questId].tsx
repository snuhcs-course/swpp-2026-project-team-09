/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { PostScreen } from '@/screens/party/post-screen';

// 파티 모집글, above the tabs: `/post/<questId>`.
export default function PostRoute(): ReactElement {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  return <PostScreen questId={questId} />;
}

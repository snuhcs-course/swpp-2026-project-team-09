import type { ReactElement } from 'react';
import { MatchingScreen } from '@/screens/events/matching-screen';

// AI 매칭 신청, above the tabs: the User's waiting requests for Matching.
export default function MatchingRoute(): ReactElement {
  return <MatchingScreen />;
}

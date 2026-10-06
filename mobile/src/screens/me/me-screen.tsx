import type { ReactElement } from 'react';
import { EmptyState } from '@/design-system';
import { TabScreen } from '../shell/tab-screen';

// The 내 정보 tab, the `Profile` frame's app bar. What it shows belongs to another ticket.
export function MeScreen(): ReactElement {
  return (
    <TabScreen title="내 정보">
      <EmptyState words="준비 중이에요" />
    </TabScreen>
  );
}

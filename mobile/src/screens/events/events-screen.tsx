import type { ReactElement } from 'react';
import { EmptyState } from '@/design-system';
import { TabScreen } from '../shell/tab-screen';

// The 행사 tab, the `Events` frame's app bar. What it lists belongs to another task.
export function EventsScreen(): ReactElement {
  return (
    <TabScreen title="행사">
      <EmptyState words="준비 중이에요" />
    </TabScreen>
  );
}

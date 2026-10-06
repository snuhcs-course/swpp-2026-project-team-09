import type { ReactElement } from 'react';
import { Button, EmptyState, SegmentedTabs, useNotReadyToast } from '@/design-system';
import { TabScreen } from '../shell/tab-screen';

export type PartyTab = 'find' | 'mine' | 'invites';

const SEGMENTS = [
  { key: 'find', label: '찾기' },
  { key: 'mine', label: '내 파티' },
  { key: 'invites', label: '초대' },
] as const;

interface PartyScreenProps {
  tab: PartyTab;
  onTab: (tab: PartyTab) => void;
}

// The 파티 tab, the `Party` frame's app bar and tabs. What each tab lists belongs to another task.
export function PartyScreen({ tab, onTab }: PartyScreenProps): ReactElement {
  const showNotReady = useNotReadyToast();
  return (
    <TabScreen
      actions={
        <Button icon="plus" onPress={showNotReady}>
          만들기
        </Button>
      }
      title="파티"
    >
      <SegmentedTabs onSelect={onTab} segments={SEGMENTS} selected={tab} />
      <EmptyState words="준비 중이에요" />
    </TabScreen>
  );
}

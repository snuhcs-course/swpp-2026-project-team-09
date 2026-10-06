import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Button, SegmentedTabs } from '@/design-system';
import { usePartyCounts } from '@/features/party/use-party';
import { TabScreen } from '../shell/tab-screen';
import { FindTab } from './find-tab';
import { InvitesTab } from './invites-tab';
import { MineTab } from './mine-tab';

export type PartyTab = 'find' | 'mine' | 'invites';

interface PartyScreenProps {
  tab: PartyTab;
  onTab: (tab: PartyTab) => void;
}

// The 파티 tab, the `Party` frame: 찾기, 내 파티 and 초대 under its app bar.
export function PartyScreen({ tab, onTab }: PartyScreenProps): ReactElement {
  const counts = usePartyCounts();
  return (
    <TabScreen
      actions={
        <Button
          icon="plus"
          onPress={() => {
            router.push('/party-form');
          }}
        >
          만들기
        </Button>
      }
      title="파티"
    >
      <SegmentedTabs
        onSelect={onTab}
        segments={[
          { key: 'find', label: '찾기' },
          { key: 'mine', label: '내 파티', count: counts.mine },
          { key: 'invites', label: '초대', count: counts.invites, alert: true },
        ]}
        selected={tab}
      />
      {tab === 'find' ? <FindTab /> : null}
      {tab === 'mine' ? <MineTab /> : null}
      {tab === 'invites' ? <InvitesTab /> : null}
    </TabScreen>
  );
}

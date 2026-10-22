/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { Button, SegmentedTabs } from '@/design-system';
import { usePartyCounts } from '@/features/party/use-party';
import { EDGE_WIDTH, sidewaysSwipe, startsAtEdge, swipeStep, TAB_SWIPE } from '@/navigation/swipe-rule';
import { TabScreen } from '../shell/tab-screen';
import { FindTab } from './find-tab';
import { InvitesTab } from './invites-tab';
import { MineTab } from './mine-tab';

export type PartyTab = 'find' | 'mine' | 'invites';

const TABS: readonly PartyTab[] = ['find', 'mine', 'invites'];

interface PartyScreenProps {
  tab: PartyTab;
  onTab: (tab: PartyTab) => void;
}

// A sideways swipe anywhere under the app bar moves to the next tab, to the left, or the previous, to the right, as a
// press on it does, and no further than 찾기 and 초대. A swipe from the left edge is the edge's back, and one up or
// down is the list's scroll. A sideways scroller inside takes its own swipe first.
function TabSwipe({ tab, onTab, children }: PartyScreenProps & { children: ReactNode }): ReactElement {
  const swipe = sidewaysSwipe('party-tab-swipe', TAB_SWIPE)
    .hitSlop({ left: -EDGE_WIDTH })
    .onEnd(({ absoluteX, translationX, velocityX }) => {
      if (startsAtEdge(absoluteX - translationX)) {
        return;
      }
      const next = TABS[TABS.indexOf(tab) + swipeStep(translationX, velocityX, TAB_SWIPE)];
      if (next !== undefined && next !== tab) {
        onTab(next);
      }
    });
  return (
    <GestureDetector gesture={swipe}>
      <View collapsable={false} style={styles.swiped}>
        {children}
      </View>
    </GestureDetector>
  );
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
      <TabSwipe onTab={onTab} tab={tab}>
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
      </TabSwipe>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  swiped: { flex: 1 },
});

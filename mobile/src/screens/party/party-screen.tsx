/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-23  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, type ReactNode, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { FloatingActionArea, SegmentedTabs } from '@/design-system';
import { usePartyCounts } from '@/features/party/use-party';
import { EDGE_WIDTH, sidewaysSwipe, startsAtEdge, swipeStep, TAB_SWIPE } from '@/navigation/swipe-rule';
import { TabScreen, type TabSearch } from '../shell/tab-screen';
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
  const swipe = useMemo(
    () =>
      sidewaysSwipe('party-tab-swipe', TAB_SWIPE)
        .hitSlop({ left: -EDGE_WIDTH })
        .onEnd(({ absoluteX, translationX, velocityX }) => {
          if (startsAtEdge(absoluteX - translationX)) {
            return;
          }
          const next = TABS[TABS.indexOf(tab) + swipeStep(translationX, velocityX, TAB_SWIPE)];
          if (next !== undefined && next !== tab) {
            onTab(next);
          }
        }),
    [tab, onTab],
  );
  return (
    <GestureDetector gesture={swipe}>
      <View collapsable={false} style={styles.swiped}>
        {children}
      </View>
    </GestureDetector>
  );
}

// The app bar's search: its words, or null while the title shows, and the move to another tab, which closes it.
function usePartySearch(
  tab: PartyTab,
  onTab: (tab: PartyTab) => void,
): { search: TabSearch; toTab: (tab: PartyTab) => void } {
  const [words, setWords] = useState<string | null>(null);
  return {
    search: {
      label: '파티 검색',
      field: '파티 검색어',
      placeholder: '파티 검색',
      words,
      onWords: (next) => {
        if (next !== null && tab !== 'find') {
          onTab('find');
        }
        setWords(next);
      },
    },
    toTab: (next) => {
      if (next !== 'find') {
        setWords(null);
      }
      onTab(next);
    },
  };
}

// The 파티 tab, the `Party` frame: 찾기, 내 파티 and 초대 under its app bar. Its search, in the app bar as 행사's,
// narrows 찾기 within the board chosen; opened from 내 파티 or 초대 it goes to 찾기, and leaving 찾기 closes it. 파티
// 만들기 floats over its three tabs (P06 ticket 52).
export function PartyScreen({ tab, onTab }: PartyScreenProps): ReactElement {
  const counts = usePartyCounts();
  const { search, toTab } = usePartySearch(tab, onTab);
  return (
    <TabScreen search={search} title="파티">
      <FloatingActionArea
        icon="pencil"
        label="파티 만들기"
        onPress={() => {
          router.push('/party-form');
        }}
      >
        <TabSwipe onTab={toTab} tab={tab}>
          <SegmentedTabs
            onSelect={toTab}
            segments={[
              { key: 'find', label: '찾기' },
              { key: 'mine', label: '내 파티', count: counts.mine },
              { key: 'invites', label: '초대', count: counts.invites, alert: true },
            ]}
            selected={tab}
          />
          {tab === 'find' ? <FindTab search={search.words} /> : null}
          {tab === 'mine' ? <MineTab /> : null}
          {tab === 'invites' ? <InvitesTab /> : null}
        </TabSwipe>
      </FloatingActionArea>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  swiped: { flex: 1 },
});

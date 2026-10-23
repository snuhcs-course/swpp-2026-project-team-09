/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Tabs } from 'expo-router';
import type { ReactElement } from 'react';
import { TabEdgeBack } from '@/navigation/edge-back';
import { TabBar } from '@/screens/shell/tab-bar';

// The bottom navigation's tabs: 지도, 파티, 행사 and 내 정보. A tab stays mounted while another is shown, so the map
// keeps its native view, its camera and what is open on it. Android's back button on another tab shows 지도, and on
// 지도 it leaves the app. A swipe from the left edge does the same on another tab, and nothing on 지도, whose edges
// the map's drags need.
export default function TabsLayout(): ReactElement {
  return (
    <Tabs
      backBehavior="firstRoute"
      screenLayout={({ route, navigation, children }) =>
        route.name === 'main' ? (
          children
        ) : (
          <TabEdgeBack
            name={route.name}
            onBack={() => {
              navigation.navigate('main');
            }}
          >
            {children}
          </TabEdgeBack>
        )
      }
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="main" />
      <Tabs.Screen name="party" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

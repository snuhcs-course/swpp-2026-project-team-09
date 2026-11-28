/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Tabs } from 'expo-router';
import type { ReactElement } from 'react';
import { TabEdgeBack } from '@/navigation/edge-back';
import { AiRaisedProvider } from '@/screens/shell/ai-raised';
import { TabBar } from '@/screens/shell/tab-bar';

// The bottom navigation's tabs: the map (`main`, the bar's middle), 파티, 행사, 알림 and 내 정보. The map is the first
// route, whatever the bar's order. A tab stays mounted while another is shown, so the map keeps its native view, its
// camera and what is open on it. Android's back button on another tab shows the map, and on the map it leaves the app.
// A swipe from the left edge does the same on another tab, and nothing on the map, whose edges the map's drags need.
// Whether the AI is raised on the map is held here, for the bar and the map, and the tabs start with it raised.
export default function TabsLayout(): ReactElement {
  return (
    <AiRaisedProvider>
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
        <Tabs.Screen name="notifications" />
        <Tabs.Screen name="me" />
      </Tabs>
    </AiRaisedProvider>
  );
}

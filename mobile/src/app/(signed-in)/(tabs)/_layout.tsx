import { Tabs } from 'expo-router';
import type { ReactElement } from 'react';
import { TabBar } from '@/screens/shell/tab-bar';

// The bottom navigation's tabs: 지도, 파티, 행사 and 내 정보. A tab stays mounted while another is shown, so the map
// keeps its native view, its camera and what is open on it. Android's back button on another tab shows 지도, and on
// 지도 it leaves the app.
export default function TabsLayout(): ReactElement {
  return (
    <Tabs backBehavior="firstRoute" screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="main" />
      <Tabs.Screen name="party" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

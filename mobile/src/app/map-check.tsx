// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-05 to 2026-10-08, prompted by AhnJinYoung and fyoon46
import { Redirect } from 'expo-router';
import type { ReactElement } from 'react';
import { MapCheckScreen } from '@/screens/map-check-screen';

// The map component with sample markers, an Avatar that moves and two lines. For developers: a released app has
// no way here.
export default function MapCheck(): ReactElement {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <MapCheckScreen />;
}

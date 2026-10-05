import { Redirect } from 'expo-router';
import type { ReactElement } from 'react';
import { MapCheckScreen } from '@/screens/map-check-screen';

// The map component with sample markers, an Avatar that moves and a route line. For developers: a released app has
// no way here.
export default function MapCheck(): ReactElement {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <MapCheckScreen />;
}

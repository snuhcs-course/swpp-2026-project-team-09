/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

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

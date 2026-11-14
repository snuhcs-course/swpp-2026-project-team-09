/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Redirect } from 'expo-router';
import type { ReactElement } from 'react';
import { PushCheckScreen } from '@/screens/push-check-screen';

// The push permission and the phone's Expo push token. For developers: a released app has no way here.
export default function PushCheck(): ReactElement {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <PushCheckScreen />;
}

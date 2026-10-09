/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { LoadingScreen } from '@/screens/loading-screen';
import { useOwnPlace } from '@/session/session';

// The app starts here, on the loading screen. Once it is over, this address leads to where the User belongs; the
// loading screen stays drawn until the next screen has taken its place.
export default function StartScreen(): ReactElement {
  const away = useOwnPlace('loading');
  return (
    <>
      <LoadingScreen />
      {away}
    </>
  );
}

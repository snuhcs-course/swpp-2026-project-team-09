// AI-generated with Claude Opus 5.5, 2026-09-29 to 2026-10-05, prompted by fyoon46 and AhnJinYoung, reviewed by TaeHyun79 and Jaehyun0320 in #3 #50
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

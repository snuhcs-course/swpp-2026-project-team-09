// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
import type { ReactElement } from 'react';
import { SignInScreen } from '@/screens/sign-in-screen';
import { useOwnPlace } from '@/session/session';

// The sign-in screen's place.
export default function SignInRoute(): ReactElement {
  return useOwnPlace('signed-out') ?? <SignInScreen />;
}

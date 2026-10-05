import type { ReactElement } from 'react';
import { SignInScreen } from '@/screens/sign-in-screen';
import { useOwnPlace } from '@/session/session';

// The sign-in screen's place.
export default function SignInRoute(): ReactElement {
  return useOwnPlace('signed-out') ?? <SignInScreen />;
}

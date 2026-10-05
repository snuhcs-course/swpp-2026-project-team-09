import type { ReactElement } from 'react';
import { MainScreen } from '@/screens/main/main-screen';
import { useOwnPlace } from '@/session/session';

// The main screen's place: a signed-in User who agreed to the legal documents and finished Onboarding.
export default function MainRoute(): ReactElement {
  return useOwnPlace('ready') ?? <MainScreen />;
}

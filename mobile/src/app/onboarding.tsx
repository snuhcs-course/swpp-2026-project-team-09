import type { ReactElement } from 'react';
import { OnboardingScreen } from '@/screens/onboarding/onboarding-screen';
import { useOwnPlace } from '@/session/session';

// Onboarding's place: a signed-in User who agreed to the legal documents and has not finished Onboarding.
export default function OnboardingRoute(): ReactElement {
  return useOwnPlace('onboarding') ?? <OnboardingScreen />;
}

import { act } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import type { ReactElement } from 'react';
import * as SignedInLayout from '@/app/(signed-in)/_layout';
import TabsLayout from '@/app/(signed-in)/(tabs)/_layout';
import EventsScreen from '@/app/(signed-in)/(tabs)/events';
import MainScreen from '@/app/(signed-in)/(tabs)/main';
import MeScreen from '@/app/(signed-in)/(tabs)/me';
import PartyScreen from '@/app/(signed-in)/(tabs)/party';
import QuestsScreen from '@/app/(signed-in)/quests';
import ConsentScreen from '@/app/consent';
import StartScreen from '@/app/index';
import LegalScreen from '@/app/legal/[document]';
import OnboardingScreen from '@/app/onboarding';
import SignInScreen from '@/app/sign-in';
import { AppProviders } from '@/app-providers';

// The root layout without the fonts, which a test does not load.
function Layout(): ReactElement {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}

// The started app. The address readers are on what `renderRouter` gives at once, not on what it settles to.
let started: ReturnType<typeof renderRouter> | null = null;

// Starts the app's screens at an address, as a start of the app or a link would.
export async function startApp(initialUrl = '/'): Promise<void> {
  started = renderRouter(
    {
      _layout: Layout,
      index: StartScreen,
      'sign-in': SignInScreen,
      consent: ConsentScreen,
      'legal/[document]': LegalScreen,
      onboarding: OnboardingScreen,
      '(signed-in)/_layout': SignedInLayout,
      '(signed-in)/(tabs)/_layout': TabsLayout,
      '(signed-in)/(tabs)/main': MainScreen,
      '(signed-in)/(tabs)/party': PartyScreen,
      '(signed-in)/(tabs)/events': EventsScreen,
      '(signed-in)/(tabs)/me': MeScreen,
      '(signed-in)/quests': QuestsScreen,
    },
    { initialUrl },
  );
  await started;
}

// The address the app shows, with its parameters: "/me?show=sharing".
export function shownAddress(): string {
  if (started === null) {
    throw new Error('The app has not started');
  }
  return started.getPathnameWithParams();
}

// Lets time pass, the mocks answer and the screens follow. Use with Jest's fake timers.
export async function pass(milliseconds: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

export { screen };

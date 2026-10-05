import { act } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import type { ReactElement } from 'react';
import StartScreen from '@/app/index';
import LegalScreen from '@/app/legal/[document]';
import MainScreen from '@/app/main';
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

// Starts the app's screens at an address, as a start of the app or a link would.
export async function startApp(initialUrl = '/'): Promise<void> {
  await renderRouter(
    {
      _layout: Layout,
      index: StartScreen,
      'sign-in': SignInScreen,
      'legal/[document]': LegalScreen,
      onboarding: OnboardingScreen,
      main: MainScreen,
    },
    { initialUrl },
  );
}

// Lets time pass, the mocks answer and the screens follow. Use with Jest's fake timers.
export async function pass(milliseconds: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

export { screen };

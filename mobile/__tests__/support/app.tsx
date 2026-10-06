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
import BoardScreen from '@/app/(signed-in)/boards/[board]';
import BoardsScreen from '@/app/(signed-in)/boards/index';
import NotificationsScreen from '@/app/(signed-in)/notifications';
import PartyFormScreen from '@/app/(signed-in)/party-form';
import PlaceMapScreen from '@/app/(signed-in)/place-map';
import PostScreen from '@/app/(signed-in)/post/[questId]';
import ProfileEditScreen from '@/app/(signed-in)/profile-edit';
import InviteScreen from '@/app/(signed-in)/invite/[token]';
import AddFriendScreen from '@/app/(signed-in)/me/friends/add';
import FriendsScreen from '@/app/(signed-in)/me/friends/index';
import FriendRequestsScreen from '@/app/(signed-in)/me/friends/requests';
import MapSourcesScreen from '@/app/(signed-in)/map-sources';
import MenusScreen from '@/app/(signed-in)/menus';
import ClassFormScreen from '@/app/(signed-in)/me/timetable/class';
import TimetableScreen from '@/app/(signed-in)/me/timetable/index';
import QuestsScreen from '@/app/(signed-in)/quests';
import RoomScreen from '@/app/(signed-in)/room/[questId]';
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
      '(signed-in)/notifications': NotificationsScreen,
      '(signed-in)/profile-edit': ProfileEditScreen,
      '(signed-in)/me/friends/index': FriendsScreen,
      '(signed-in)/me/friends/requests': FriendRequestsScreen,
      '(signed-in)/me/friends/add': AddFriendScreen,
      '(signed-in)/me/timetable/index': TimetableScreen,
      '(signed-in)/me/timetable/class': ClassFormScreen,
      '(signed-in)/invite/[token]': InviteScreen,
      '(signed-in)/menus': MenusScreen,
      '(signed-in)/map-sources': MapSourcesScreen,
      '(signed-in)/room/[questId]': RoomScreen,
      '(signed-in)/place-map': PlaceMapScreen,
      '(signed-in)/boards/index': BoardsScreen,
      '(signed-in)/boards/[board]': BoardScreen,
      '(signed-in)/post/[questId]': PostScreen,
      '(signed-in)/party-form': PartyFormScreen,
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

// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by fyoon46
import { type NativeStackNavigationOptions, router, Stack, useGlobalSearchParams, useSegments } from 'expo-router';
import { type ReactElement, useEffect } from 'react';
import { MatchingWatch } from '@/features/events/matching-watch';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { BackgroundSharingProvider, PositionProvider, PositionSending } from '@/position';
import { useOwnPlace } from '@/session/session';
import { keep, readKeptAfterChanges } from '@/storage/kept';

// The tabs lie under every screen above them, also when the app is opened at such a screen's address.
export const unstable_settings = { initialRouteName: '(tabs)' };

const SLIDE_MS = 280;

// A screen above the tabs slides in, from the bottom for the Quest list on the whole screen and the menu panel, from
// the right for the sources of the map's data, and appears without sliding where the phone asks for less motion.
function slideFrom(edge: 'bottom' | 'right', reduceMotion: boolean): NativeStackNavigationOptions {
  if (reduceMotion) {
    return { animation: 'none', animationDuration: SLIDE_MS };
  }
  return { animation: edge === 'bottom' ? 'slide_from_bottom' : 'slide_from_right', animationDuration: SLIDE_MS };
}

// An Invite Link opened before the User belongs here, at the start of the app or signed out, is kept on the phone, and
// its accept screen is shown once the User is here: after the loading screen, or after the sign-in, the consent and
// Onboarding. Opened while the User is here, the link shows its screen at once.
function useInviteLinks(here: boolean): void {
  const segments: readonly string[] = useSegments();
  const { token } = useGlobalSearchParams<{ token?: string }>();
  const opened = segments[1] === 'invite' && typeof token === 'string' ? token : null;
  useEffect(() => {
    if (!here && opened !== null) {
      void keep({ inviteToken: opened });
    }
  }, [here, opened]);
  useEffect(() => {
    if (here) {
      void readKeptAfterChanges().then(({ inviteToken }) => {
        if (inviteToken !== null) {
          router.push({ pathname: '/invite/[token]', params: { token: inviteToken } });
        }
      });
    }
  }, [here]);
}

// The signed-in place: a User who agreed to the legal documents and finished Onboarding. The tabs, and the screens
// that cover them, which the stack's back closes. The User's position is watched here, once for all of them, and sent
// from here while the Master Switch is on, in front and, where the User chose it, in the background. The User's requests
// for Matching are watched here too.
export default function SignedInLayout(): ReactElement {
  const reduceMotion = useReduceMotion();
  const away = useOwnPlace('ready');
  useInviteLinks(away === null);
  if (away !== null) {
    return away;
  }
  return (
    <PositionProvider>
      <PositionSending>
        <BackgroundSharingProvider>
          <MatchingWatch />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="quests" options={slideFrom('bottom', reduceMotion)} />
            <Stack.Screen name="notifications" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="profile-edit" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="me/friends/index" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="me/friends/requests" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="me/friends/add" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="me/timetable/index" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="me/timetable/class" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="invite/[token]" options={slideFrom('bottom', reduceMotion)} />
            <Stack.Screen name="menus" options={slideFrom('bottom', reduceMotion)} />
            <Stack.Screen name="map-sources" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="room/[questId]" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="place-map" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="boards/index" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="boards/[board]" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="post/[questId]" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="party-form" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="matching" options={slideFrom('right', reduceMotion)} />
            <Stack.Screen name="meetup/[friendId]" options={slideFrom('bottom', reduceMotion)} />
          </Stack>
        </BackgroundSharingProvider>
      </PositionSending>
    </PositionProvider>
  );
}

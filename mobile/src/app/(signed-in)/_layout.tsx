/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type NativeStackNavigationOptions, router, Stack, useGlobalSearchParams, useSegments } from 'expo-router';
import { Stack as JsStack, type StackNavigationOptions } from 'expo-router/js-stack';
import { type ReactElement, useEffect } from 'react';
import { Platform } from 'react-native';
import { MatchingWatch } from '@/features/events/matching-watch';
import { VersionsAtLaunch } from '@/features/timetable/use-versions';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { EDGE_WIDTH } from '@/navigation/swipe-rule';
import { BackgroundSharingProvider, PositionProvider, PositionSending } from '@/position';
import { useOwnPlace } from '@/session/session';
import { keep, readKeptAfterChanges } from '@/storage/kept';

// The tabs lie under every screen above them, also when the app is opened at such a screen's address.
export const unstable_settings = { initialRouteName: '(tabs)' };

const SLIDE_MS = 280;

type Edge = 'bottom' | 'right';

// The screens above the tabs, each with the edge it slides in from: from the bottom for the Quest list on the whole
// screen, the menu panel and an Invite Link's accept screen, from the right for the others.
const ABOVE_TABS: readonly (readonly [name: string, edge: Edge])[] = [
  ['quests', 'bottom'],
  ['notifications', 'right'],
  ['profile-edit', 'right'],
  ['me/friends/index', 'right'],
  ['me/friends/requests', 'right'],
  ['me/friends/add', 'right'],
  ['me/parties', 'right'],
  ['me/timetable/index', 'right'],
  ['me/timetable/class', 'right'],
  ['invite/[token]', 'bottom'],
  ['menus', 'bottom'],
  ['map-sources', 'right'],
  ['room/[questId]', 'right'],
  ['place-map', 'right'],
  ['boards/index', 'right'],
  ['boards/[board]', 'right'],
  ['post/[questId]', 'right'],
  ['party-form', 'right'],
  ['matching', 'right'],
];

// A screen above the tabs slides in from its edge, and appears without sliding where the phone asks for less motion.
function slideFrom(edge: Edge, reduceMotion: boolean): NativeStackNavigationOptions {
  if (reduceMotion) {
    return { animation: 'none', animationDuration: SLIDE_MS };
  }
  return { animation: edge === 'bottom' ? 'slide_from_bottom' : 'slide_from_right', animationDuration: SLIDE_MS };
}

// The same on Android's JS stack, where a swipe from the left edge also goes back with the screen under the finger:
// it slides right, or down for one from the bottom, and past half the screen it goes. Where the phone asks for less
// motion the screen stays still under the finger and only the line counts.
function cardFrom(edge: Edge, reduceMotion: boolean): StackNavigationOptions {
  let animation: StackNavigationOptions['animation'] = edge === 'bottom' ? 'slide_from_bottom' : 'slide_from_right';
  if (reduceMotion) {
    animation = 'none';
  }
  return { animation, gestureEnabled: true, gestureDirection: 'horizontal', gestureResponseDistance: EDGE_WIDTH };
}

// The tabs and the screens that cover them, which the stack's back closes. On iOS the native stack, whose own swipe
// from the left edge goes back. On Android a native stack has no swipe back that follows the finger, so the stack
// there is the JS one that expo-router carries.
function AboveTabs({ reduceMotion }: { reduceMotion: boolean }): ReactElement {
  if (Platform.OS === 'android') {
    return (
      <JsStack screenOptions={{ headerShown: false }}>
        <JsStack.Screen name="(tabs)" />
        {ABOVE_TABS.map(([name, edge]) => (
          <JsStack.Screen key={name} name={name} options={cardFrom(edge, reduceMotion)} />
        ))}
      </JsStack>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      {ABOVE_TABS.map(([name, edge]) => (
        <Stack.Screen key={name} name={name} options={slideFrom(edge, reduceMotion)} />
      ))}
    </Stack>
  );
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
// that cover them. The User's position is watched here, once for all of them, and sent
// from here while the Master Switch is on, in front and, where the User chose it, in the background. The User's requests
// for Matching are watched here too, and a switch of timetable versions left unfinished is finished from here.
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
          <VersionsAtLaunch />
          <AboveTabs reduceMotion={reduceMotion} />
        </BackgroundSharingProvider>
      </PositionSending>
    </PositionProvider>
  );
}

import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { PositionProvider, PositionSending } from '@/position';
import { useOwnPlace } from '@/session/session';

// The tabs lie under every screen above them, also when the app is opened at such a screen's address.
export const unstable_settings = { initialRouteName: '(tabs)' };

const SLIDE_MS = 280;

// A screen above the tabs slides in, from the bottom for the Quest list on the whole screen, and appears without
// sliding where the phone asks for less motion.
function slideFrom(edge: 'bottom' | 'right', reduceMotion: boolean): NativeStackNavigationOptions {
  if (reduceMotion) {
    return { animation: 'none', animationDuration: SLIDE_MS };
  }
  return { animation: edge === 'bottom' ? 'slide_from_bottom' : 'slide_from_right', animationDuration: SLIDE_MS };
}

// The signed-in place: a User who agreed to the legal documents and finished Onboarding. The tabs, and the screens
// that cover them, which the stack's back closes. The User's position is watched here, once for all of them, and sent
// from here while the Master Switch is on.
export default function SignedInLayout(): ReactElement {
  const reduceMotion = useReduceMotion();
  const away = useOwnPlace('ready');
  if (away !== null) {
    return away;
  }
  return (
    <PositionProvider>
      <PositionSending>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="quests" options={slideFrom('bottom', reduceMotion)} />
          <Stack.Screen name="notifications" options={slideFrom('right', reduceMotion)} />
          <Stack.Screen name="profile-edit" options={slideFrom('right', reduceMotion)} />
        </Stack>
      </PositionSending>
    </PositionProvider>
  );
}

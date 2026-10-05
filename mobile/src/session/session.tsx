import { Redirect } from 'expo-router';
import { createContext, type ReactElement, type ReactNode, use, useCallback, useMemo, useState } from 'react';
import type { Onboarding, Suggestion } from '@/api/types';

// Where the User is in the app's flow. `loading` is only the start of the app: nothing leads back to it.
export type SessionStatus = 'loading' | 'signed-out' | 'onboarding' | 'ready';

// What the start of the app found, or a sign-in brought.
export interface Opened {
  status: Exclude<SessionStatus, 'loading'>;
  // What the sign-in suggested for Onboarding. Null outside Onboarding.
  suggestion: Suggestion | null;
}

interface Session extends Omit<Opened, 'status'> {
  status: SessionStatus;
  // The loading screen is over: the app goes where the User belongs.
  open: (opened: Opened) => void;
  // A sign-in succeeded.
  enter: (onboarding: Onboarding) => void;
  // Onboarding was saved.
  finishOnboarding: () => void;
  // The User signed out.
  leave: () => void;
}

const SessionContext = createContext<Session | null>(null);

const PLACE = { loading: '/', 'signed-out': '/sign-in', onboarding: '/onboarding', ready: '/main' } as const;

export function openedBy(onboarding: Onboarding): Opened {
  return onboarding.completed
    ? { status: 'ready', suggestion: null }
    : { status: 'onboarding', suggestion: onboarding.suggestion };
}

// Holds where the User is, for the screens to follow. The phone keeps the same through the sign-in module and the
// client; this is the app's memory of it while it runs.
export function SessionProvider({ children }: { children: ReactNode }): ReactElement {
  const [opened, setOpened] = useState<Opened | null>(null);
  const enter = useCallback((onboarding: Onboarding) => {
    setOpened(openedBy(onboarding));
  }, []);
  const finishOnboarding = useCallback(() => {
    setOpened({ status: 'ready', suggestion: null });
  }, []);
  const leave = useCallback(() => {
    setOpened({ status: 'signed-out', suggestion: null });
  }, []);
  const session = useMemo(
    (): Session => ({
      status: opened?.status ?? 'loading',
      suggestion: opened?.suggestion ?? null,
      open: setOpened,
      enter,
      finishOnboarding,
      leave,
    }),
    [opened, enter, finishOnboarding, leave],
  );
  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (session === null) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return session;
}

// For a screen that belongs to one place of the flow: null while the User belongs there, and otherwise the way to
// where they do, which the screen shows in place of itself. So nobody reaches the main screen without a sign-in, or
// the sign-in screen once signed in.
export function useOwnPlace(place: SessionStatus): ReactElement | null {
  const { status } = useSession();
  return status === place ? null : <Redirect href={PLACE[status]} />;
}

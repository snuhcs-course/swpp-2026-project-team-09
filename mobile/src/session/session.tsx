import { useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Onboarding, Suggestion } from '@/api/types';
import { Dialog } from '@/design-system';
import { listenToSession, type SessionEvent } from './session-events';

// Where the User is in the app's flow. `loading` is only the start of the app: nothing leads back to it.
export type SessionStatus = 'loading' | 'signed-out' | 'consent' | 'onboarding' | 'ready';

// What the start of the app found, or a sign-in brought.
export interface Opened {
  status: Exclude<SessionStatus, 'loading'>;
  // What the sign-in suggested for Onboarding. Null outside Onboarding.
  suggestion: Suggestion | null;
  // Where the User goes once they agreed. Only with `consent`.
  next?: Opened;
}

interface Session extends Omit<Opened, 'status' | 'next'> {
  status: SessionStatus;
  // The loading screen is over: the app goes where the User belongs.
  open: (opened: Opened) => void;
  // A sign-in succeeded. `consented` is whether the User agreed to the legal documents on this phone before.
  enter: (onboarding: Onboarding, consented: boolean) => void;
  // The User agreed to the legal documents.
  agree: () => void;
  // Onboarding was saved.
  finishOnboarding: () => void;
  // The User signed out.
  leave: () => void;
}

const SessionContext = createContext<Session | null>(null);

const PLACE = {
  loading: '/',
  'signed-out': '/sign-in',
  consent: '/consent',
  onboarding: '/onboarding',
  ready: '/main',
} as const;

export function openedBy(onboarding: Onboarding): Opened {
  return onboarding.completed
    ? { status: 'ready', suggestion: null }
    : { status: 'onboarding', suggestion: onboarding.suggestion };
}

// A signed-in User who has not agreed to the legal documents is asked first, and goes on from there.
export function behindConsent(opened: Opened, consented: boolean): Opened {
  return consented || opened.status === 'signed-out' ? opened : { status: 'consent', suggestion: null, next: opened };
}

// Where an event of the Session takes the User from where they are. The loading screen is left alone: its own work
// meets the same refusals and ends where they lead. A signed-out User stays signed out.
export function followed(now: Opened | null, event: SessionEvent): Opened | null {
  if (now === null || now.status === 'signed-out') {
    return now;
  }
  if (event.kind === 'ended') {
    return { status: 'signed-out', suggestion: null };
  }
  return now.status === 'ready' ? { status: 'onboarding', suggestion: event.suggestion } : now;
}

// The words of the dialog after a sign-in on another phone ended this Session.
const REPLACED = {
  title: '다른 기기에서 로그인했어요',
  body: '이 기기에서는 로그아웃됐어요. 다시 쓰려면 로그인해 주세요.',
  confirm: '확인',
} as const;

// The dialog after a sign-in on another phone ended this Session. It has one answer, which only closes it.
function ReplacedDialog({ visible, onClose }: { visible: boolean; onClose: () => void }): ReactElement {
  return (
    <Dialog
      body={REPLACED.body}
      confirmLabel={REPLACED.confirm}
      onCancel={onClose}
      onConfirm={onClose}
      title={REPLACED.title}
      visible={visible}
    />
  );
}

// Follows the events of the Session, from any request and from the socket connection. Gives whether the dialog about
// a replaced Session is to be shown, and the way to close it.
function useSessionEvents(follow: (event: SessionEvent) => void): [boolean, () => void] {
  const queryClient = useQueryClient();
  const [replaced, setReplaced] = useState(false);
  useEffect(
    () =>
      listenToSession((event) => {
        if (event.kind === 'ended') {
          // What was fetched for one User is not shown to the next.
          queryClient.clear();
          if (event.replaced) {
            setReplaced(true);
          }
        }
        follow(event);
      }),
    [queryClient, follow],
  );
  const close = useCallback(() => {
    setReplaced(false);
  }, []);
  return [replaced, close];
}

// Holds where the User is, for the screens to follow. The phone keeps the same through the sign-in module and the
// client; this is the app's memory of it while it runs. The Session's end and the main server's word on Onboarding
// reach it as events (`session-events.ts`).
export function SessionProvider({ children }: { children: ReactNode }): ReactElement {
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState<Opened | null>(null);
  const follow = useCallback((event: SessionEvent) => {
    setOpened((now) => followed(now, event));
  }, []);
  const [replaced, closeReplaced] = useSessionEvents(follow);
  const enter = useCallback((onboarding: Onboarding, consented: boolean) => {
    setOpened(behindConsent(openedBy(onboarding), consented));
  }, []);
  const agree = useCallback(() => {
    setOpened((now) => now?.next ?? now);
  }, []);
  const finishOnboarding = useCallback(() => {
    setOpened({ status: 'ready', suggestion: null });
  }, []);
  const leave = useCallback(() => {
    queryClient.clear();
    setOpened({ status: 'signed-out', suggestion: null });
  }, [queryClient]);
  const session = useMemo(
    (): Session => ({
      status: opened?.status ?? 'loading',
      suggestion: opened?.suggestion ?? null,
      open: setOpened,
      enter,
      agree,
      finishOnboarding,
      leave,
    }),
    [opened, enter, agree, finishOnboarding, leave],
  );
  return (
    <SessionContext value={session}>
      {children}
      <ReplacedDialog onClose={closeReplaced} visible={replaced} />
    </SessionContext>
  );
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

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useToast } from '@/design-system';
import type { LoginOutcome } from './client';
import { endLibrarySession } from './end-session';
import { isLibraryLoggedIn, listenToLibraryFlag, markLibraryLoggedIn } from './flag';
import { HiddenLibraryView } from './hidden-view';
import { hiddenTransport } from './library';
import { LibraryLogin } from './login-view';

const LOGIN_FAILED = '로그인하지 못했어요';

interface LibrarySession {
  // The "logged in" flag, as the phone keeps it.
  loggedIn: boolean;
  // Opens the login and gives how it ended.
  logIn: () => Promise<LoginOutcome>;
  // Ends the library session (`endLibrarySession`).
  logOut: () => Promise<void>;
}

const LibrarySessionContext = createContext<LibrarySession | null>(null);

export function useLibrarySession(): LibrarySession {
  const session = use(LibrarySessionContext);
  if (session === null) {
    throw new Error('useLibrarySession needs a LibrarySessionProvider');
  }
  return session;
}

function useLoggedIn(): boolean {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    let current = true;
    const stop = listenToLibraryFlag((next) => {
      current = false;
      setLoggedIn(next);
    });
    void isLibraryLoggedIn().then((kept) => {
      if (current) {
        setLoggedIn(kept);
      }
    });
    return stop;
  }, []);
  return loggedIn;
}

// The library session over the whole app: the hidden web view at the root while the flag is set, and the login,
// opened by whichever card or row asks for it.
export function LibrarySessionProvider({ children }: { children: ReactNode }): ReactElement {
  const loggedIn = useLoggedIn();
  const showToast = useToast();
  const [loggingIn, setLoggingIn] = useState(false);
  const waiting = useRef<((outcome: LoginOutcome) => void)[]>([]);
  const logIn = useCallback(
    () =>
      new Promise<LoginOutcome>((resolve) => {
        waiting.current.push(resolve);
        setLoggingIn(true);
      }),
    [],
  );
  const done = useCallback(
    (outcome: LoginOutcome): void => {
      setLoggingIn(false);
      if (outcome === 'failed') {
        showToast(LOGIN_FAILED);
      }
      const settle = (): void => {
        for (const resolve of waiting.current.splice(0)) {
          resolve(outcome);
        }
      };
      if (outcome === 'loggedIn') {
        void markLibraryLoggedIn().then(settle);
      } else {
        settle();
      }
    },
    [showToast],
  );
  const session = useMemo(
    () => ({ loggedIn, logIn, logOut: (): Promise<void> => endLibrarySession() }),
    [loggedIn, logIn],
  );
  return (
    <LibrarySessionContext value={session}>
      {children}
      {loggedIn ? <HiddenLibraryView transport={hiddenTransport} /> : null}
      <LibraryLogin onDone={done} visible={loggingIn} />
    </LibrarySessionContext>
  );
}

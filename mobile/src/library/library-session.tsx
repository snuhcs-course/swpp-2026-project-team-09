/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
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
  useSyncExternalStore,
} from 'react';
import { useToast } from '@/design-system';
import { koreaDateKey } from '@/korea-time';
import { type LoginOutcome, loginWorks } from './client';
import { endLibrarySession } from './end-session';
import { isLibraryLoggedIn, listenToLibraryFlag, markLibraryLoggedIn, noteLoginOpened } from './flag';
import { HiddenLibraryView } from './hidden-view';
import { hiddenTransport } from './library';
import { LoginChecks } from './login-checks';
import { LibraryLogin } from './login-view';

const LOGIN_FAILED = '로그인하지 못했어요';

interface LibrarySession {
  // The "logged in" flag, as the phone keeps it.
  loggedIn: boolean;
  // How many times the session was ended on purpose (`endLibrarySession`), so that the cards that had read follow.
  logouts: number;
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

function useLoggedIn(): { loggedIn: boolean; logouts: number } {
  const [loggedIn, setLoggedIn] = useState(false);
  const [logouts, setLogouts] = useState(0);
  useEffect(() => {
    let current = true;
    const stop = listenToLibraryFlag((next, cleared) => {
      current = false;
      setLoggedIn(next);
      if (cleared === 'loggedOut') {
        setLogouts((last) => last + 1);
      }
    });
    void isLibraryLoggedIn().then((kept) => {
      if (current) {
        setLoggedIn(kept);
      }
    });
    return stop;
  }, []);
  return { loggedIn, logouts };
}

// The login's checks, which outlive the view (`login-checks.ts`). While one runs, the hidden view is mounted for its
// one read, on a page loaded afresh, before the flag is set; a session that works keeps it mounted through the flag. A
// logout cancels them; the provider's end stops them.
function useLoginChecks(logouts: number, onSession: () => void): { checking: boolean; checks: LoginChecks } {
  const [checking, setChecking] = useState(false);
  const [checks] = useState(
    () =>
      new LoginChecks({
        setChecking,
        check: (): Promise<boolean> => {
          hiddenTransport.reloadPage();
          return loginWorks(hiddenTransport, koreaDateKey(new Date()).replaceAll('-', ''));
        },
        markLoggedIn: async (): Promise<boolean> => {
          await markLibraryLoggedIn();
          return true;
        },
        onSession,
      }),
  );
  useEffect(() => {
    checks.hooks = { ...checks.hooks, onSession };
  }, [checks, onSession]);
  useEffect(() => {
    if (logouts > 0) {
      checks.cancel();
    }
  }, [checks, logouts]);
  useEffect(
    () => (): void => {
      checks.stop();
    },
    [checks],
  );
  return { checking, checks };
}

// Whether the transport wants the hidden view for a logout that neither the flag nor a check mounts it for.
function useWantedForLogout(): boolean {
  return useSyncExternalStore(
    (listener) => hiddenTransport.onWantsView(listener),
    () => hiddenTransport.wantsView(),
  );
}

// The login view: open while a card or row waits on it, and `settle`, which closes it and tells them how it ended.
function useLoginView(): {
  loggingIn: boolean;
  logIn: () => Promise<LoginOutcome>;
  settle: (outcome: LoginOutcome) => void;
} {
  const [loggingIn, setLoggingIn] = useState(false);
  const waiting = useRef<((outcome: LoginOutcome) => void)[]>([]);
  const settle = useCallback((outcome: LoginOutcome): void => {
    setLoggingIn(false);
    for (const resolve of waiting.current.splice(0)) {
      resolve(outcome);
    }
  }, []);
  const logIn = useCallback(
    () =>
      new Promise<LoginOutcome>((resolve) => {
        noteLoginOpened();
        waiting.current.push(resolve);
        setLoggingIn(true);
      }),
    [],
  );
  return { loggingIn, logIn, settle };
}

// The library session over the whole app: the hidden web view at the root while the flag is set, and the login,
// opened by whichever card or row asks for it.
export function LibrarySessionProvider({ children }: { children: ReactNode }): ReactElement {
  const { loggedIn, logouts } = useLoggedIn();
  const showToast = useToast();
  const { loggingIn, logIn, settle } = useLoginView();
  const onSession = useCallback((): void => {
    settle('loggedIn');
  }, [settle]);
  const { checking, checks } = useLoginChecks(logouts, onSession);
  const closed = useCallback(
    (outcome: Exclude<LoginOutcome, 'loggedIn'>): void => {
      if (outcome === 'failed') {
        showToast(LOGIN_FAILED);
      }
      checks.closed();
      settle(outcome);
    },
    [checks, settle, showToast],
  );
  const wanted = useWantedForLogout();
  const session = useMemo(
    () => ({ loggedIn, logouts, logIn, logOut: (): Promise<void> => endLibrarySession() }),
    [loggedIn, logouts, logIn],
  );
  return (
    <LibrarySessionContext value={session}>
      {children}
      {loggedIn || checking || wanted ? <HiddenLibraryView transport={hiddenTransport} /> : null}
      <LibraryLogin
        onDone={closed}
        onLanded={() => {
          checks.landed();
        }}
        visible={loggingIn}
      />
    </LibrarySessionContext>
  );
}

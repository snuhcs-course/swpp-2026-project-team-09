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
import { type LoginCheckHooks, LoginChecks } from './login-checks';
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
type Ended = Pick<LoginCheckHooks, 'onSession' | 'onNoSession'>;

function useLoginChecks(logouts: number, ended: Ended): { checking: boolean; checks: LoginChecks } {
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
        ...ended,
      }),
  );
  useEffect(() => {
    checks.hooks = { ...checks.hooks, ...ended };
  }, [checks, ended]);
  useEffect(() => {
    if (logouts > 0) {
      checks.cancel();
    }
  }, [checks, logouts]);
  useEffect(() => {
    checks.start();
    return (): void => {
      checks.stop();
    };
  }, [checks]);
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
  hide: () => void;
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
  const hide = useCallback((): void => {
    setLoggingIn(false);
  }, []);
  return { loggingIn, logIn, settle, hide };
}

type Closed = Exclude<LoginOutcome, 'loggedIn'>;

// How the view's close ends the login: at once, or, while a check is still to come, once it ends: "logged in" when it
// finds the session, else what the close said, with "로그인하지 못했어요" only then.
function useClose(view: ReturnType<typeof useLoginView>): {
  ended: Ended;
  close: (outcome: Closed, waits: boolean) => void;
} {
  const showToast = useToast();
  const { settle, hide } = view;
  const waiting = useRef<Closed | null>(null);
  const end = useCallback(
    (outcome: Closed): void => {
      if (outcome === 'failed') {
        showToast(LOGIN_FAILED);
      }
      settle(outcome);
    },
    [settle, showToast],
  );
  const ended = useMemo(
    (): Ended => ({
      onSession: (): void => {
        waiting.current = null;
        settle('loggedIn');
      },
      onNoSession: (): void => {
        const outcome = waiting.current;
        waiting.current = null;
        if (outcome !== null) {
          end(outcome);
        }
      },
    }),
    [end, settle],
  );
  const close = (outcome: Closed, waits: boolean): void => {
    if (waits) {
      waiting.current = outcome;
      hide();
    } else {
      end(outcome);
    }
  };
  return { ended, close };
}

// The library session over the whole app: the hidden web view at the root while the flag is set, and the login,
// opened by whichever card or row asks for it.
export function LibrarySessionProvider({ children }: { children: ReactNode }): ReactElement {
  const { loggedIn, logouts } = useLoggedIn();
  const view = useLoginView();
  const { ended, close } = useClose(view);
  const { checking, checks } = useLoginChecks(logouts, ended);
  const wanted = useWantedForLogout();
  const session = useMemo(
    () => ({ loggedIn, logouts, logIn: view.logIn, logOut: (): Promise<void> => endLibrarySession() }),
    [loggedIn, logouts, view.logIn],
  );
  return (
    <LibrarySessionContext value={session}>
      {children}
      {loggedIn || checking || wanted ? <HiddenLibraryView transport={hiddenTransport} /> : null}
      <LibraryLogin
        onDone={(outcome) => {
          close(outcome, checks.closed());
        }}
        onLanded={() => {
          checks.landed();
        }}
        onLeft={() => {
          checks.left();
        }}
        visible={view.loggingIn}
      />
    </LibrarySessionContext>
  );
}

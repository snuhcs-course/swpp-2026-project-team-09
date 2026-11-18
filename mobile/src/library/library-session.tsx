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
} from 'react';
import { useToast } from '@/design-system';
import { koreaDateKey } from '@/korea-time';
import { type LoginOutcome, loginWorks } from './client';
import { endLibrarySession } from './end-session';
import { isLibraryLoggedIn, listenToLibraryFlag, markLibraryLoggedIn } from './flag';
import { HiddenLibraryView } from './hidden-view';
import { hiddenTransport } from './library';
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

// The login's check. While it runs, the hidden view is mounted for its one read, before the flag is set; a session
// that works keeps it mounted until the flag is set. Each check reads on a page loaded afresh.
function useLoginCheck(): { checking: boolean; check: () => Promise<boolean>; stopChecking: () => void } {
  const [checking, setChecking] = useState(false);
  const check = useCallback(async (): Promise<boolean> => {
    setChecking(true);
    hiddenTransport.reloadPage();
    const works = await loginWorks(hiddenTransport, koreaDateKey(new Date()).replaceAll('-', ''));
    if (!works) {
      setChecking(false);
    }
    return works;
  }, []);
  const stopChecking = useCallback((): void => {
    setChecking(false);
  }, []);
  return { checking, check, stopChecking };
}

// The library session over the whole app: the hidden web view at the root while the flag is set, and the login,
// opened by whichever card or row asks for it.
export function LibrarySessionProvider({ children }: { children: ReactNode }): ReactElement {
  const { loggedIn, logouts } = useLoggedIn();
  const showToast = useToast();
  const [loggingIn, setLoggingIn] = useState(false);
  const { checking, check, stopChecking } = useLoginCheck();
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
        const after = (): void => {
          stopChecking();
          settle();
        };
        void markLibraryLoggedIn().then(after, after);
      } else {
        stopChecking();
        settle();
      }
    },
    [showToast, stopChecking],
  );
  const session = useMemo(
    () => ({ loggedIn, logouts, logIn, logOut: (): Promise<void> => endLibrarySession() }),
    [loggedIn, logouts, logIn],
  );
  return (
    <LibrarySessionContext value={session}>
      {children}
      {loggedIn || checking ? <HiddenLibraryView transport={hiddenTransport} /> : null}
      <LibraryLogin check={check} onDone={done} visible={loggingIn} />
    </LibrarySessionContext>
  );
}

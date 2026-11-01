/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useCallback, useEffect, useState } from 'react';
import {
  type ConfirmedPress,
  confirmedPress,
  isLibraryError,
  type LibraryFailure,
  retryAfterLogin,
} from '@/library/client';
import { useLibrarySession } from '@/library/library-session';
import type { LibraryWriteResult } from '@/library/replies';
import type { OwnBubble } from '@/features/assistant/use-chat';

// How a library card reads from the library and logs in: what it loaded or why it failed, and 로그인, which opens the
// login and then does the pressed action once more.

export type Loaded<T> =
  { state: 'loading' } | { state: 'ready'; value: T } | { state: 'failed'; failure: LibraryFailure };

export function failureOf(error: unknown): LibraryFailure {
  return isLibraryError(error) ? error.kind : 'network';
}

// Whether the User must log in (again) for the card to go on.
export function needsLogin(failure: LibraryFailure): boolean {
  return failure === 'noSession' || failure === 'sessionEnded';
}

// What the card loads when it shows and whenever `key` changes, and `reload`, which reads again.
export function useLibraryLoad<T>(load: () => Promise<T>, key: string): { loaded: Loaded<T>; reload: () => void } {
  const [loaded, setLoaded] = useState<Loaded<T>>({ state: 'loading' });
  const [round, setRound] = useState(0);
  useEffect(() => {
    let current = true;
    setLoaded({ state: 'loading' });
    load().then(
      (value) => {
        if (current) {
          setLoaded({ state: 'ready', value });
        }
      },
      (error: unknown) => {
        if (current) {
          setLoaded({ state: 'failed', failure: failureOf(error) });
        }
      },
    );
    return (): void => {
      current = false;
    };
    // The load is the card's own for its key: a new one each render would read again and again.
  }, [key, round]);
  const reload = useCallback((): void => {
    setRound((last) => last + 1);
  }, []);
  return { loaded, reload };
}

type LogInThen = (action: () => Promise<void>, failed: (failure: LibraryFailure) => void) => void;

// 로그인 of a card: the login, then `action` once. A login that did not end in a session is the card's to show.
export function useLogInThen(): LogInThen {
  const { logIn } = useLibrarySession();
  return useCallback<LogInThen>(
    (action, failed): void => {
      retryAfterLogin(logIn, action).catch((error: unknown) => {
        failed(failureOf(error));
      });
    },
    [logIn],
  );
}

// 로그인 of a card whose reading failed: the login, then the reading again.
export function useLogInReload(reload: () => void): () => void {
  const logInThen = useLogInThen();
  return () => {
    const again = (): Promise<void> => {
      reload();
      return Promise.resolve();
    };
    logInThen(again, reload);
  };
}

// What a card says when something failed: a failure's own sentence, or the card's words (the library's message).
export interface CardFailure {
  failure: LibraryFailure | null;
  message?: string;
}

export interface Write<Args> {
  busy: boolean;
  failure: CardFailure | null;
  // A press of the card's confirm button: a write with its mark.
  run: (args: Args) => void;
  // 로그인 after the session ended: the login, then the pressed write once more with the same press.
  logIn: () => void;
}

// A card's write, sent only from its confirm button. `send` answers null when it was made, or what the card says.
// A failure is never sent again by itself; `onFailed` lets the card read again to show where things stand.
export function useWrite<Args>(
  send: (args: Args, press: ConfirmedPress) => Promise<CardFailure | null>,
  onFailed: (failure: LibraryFailure) => void = () => null,
): Write<Args> {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<CardFailure | null>(null);
  const [pending, setPending] = useState<{ args: Args; press: ConfirmedPress } | null>(null);
  const logInThen = useLogInThen();
  const attempt = async (args: Args, press: ConfirmedPress): Promise<void> => {
    setFailure(null);
    setBusy(true);
    try {
      setFailure(await send(args, press));
    } catch (error) {
      const kind = failureOf(error);
      setFailure({ failure: kind });
      onFailed(kind);
    } finally {
      setBusy(false);
    }
  };
  const run = (args: Args): void => {
    const press = confirmedPress();
    setPending({ args, press });
    void attempt(args, press);
  };
  const logIn = (): void => {
    if (pending !== null) {
      logInThen(
        () => attempt(pending.args, pending.press),
        (kind) => {
          setFailure({ failure: kind });
        },
      );
    }
  };
  return { busy, failure, run, logIn };
}

// The booking number of a booking made, shown on the phone only.
export function bseqnoOf(info: Readonly<Record<string, unknown>>): string {
  const { BSEQNO: bseqno } = info;
  return typeof bseqno === 'number' || typeof bseqno === 'string' ? String(bseqno) : '';
}

// What a library card does in the chat: it adds the app's own bubbles, such as the done message or the card a tapped
// seat gives.
export interface LibraryCardActions {
  addOwn: (bubble: OwnBubble) => void;
}

// The library's own words for a refused write.
export function libraryMessage(result: LibraryWriteResult): string {
  const fail = result.bookingFailInfo;
  const message = fail === undefined ? undefined : fail.msg;
  return typeof message === 'string' ? message : (result.msg ?? '');
}

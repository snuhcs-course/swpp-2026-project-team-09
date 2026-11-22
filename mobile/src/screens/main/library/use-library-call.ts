/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
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
import type { CardOutcome, CardRoom, OwnBubble } from '@/features/assistant/use-chat';
import type { Tell } from './booking-stage';

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

// Whether what a card loaded is out of date after a login (`loggedIn`) or after the session was ended on purpose: after
// a login, a read that failed for want of a session; after a logout, a read that did not.
export function staleAfter<T>(loaded: Loaded<T>, loggedIn: boolean): boolean {
  const wantedLogin = loaded.state === 'failed' && needsLogin(loaded.failure);
  return loggedIn ? wantedLogin : !wantedLogin;
}

// Reads again after a login and after a logout when what the card shows is out of date, so that every mounted card
// follows them at once, whichever card or row they came from. A session that ended under a call is the failed card's
// to show, with its 로그인 that sends the pressed write once more, and the others find it on their next call.
function useFollowFlag<T>(loaded: Loaded<T>, reload: () => void): void {
  const { loggedIn, logouts } = useLibrarySession();
  const [seen, setSeen] = useState({ loggedIn, logouts });
  if (seen.loggedIn !== loggedIn || seen.logouts !== logouts) {
    setSeen({ loggedIn, logouts });
    const loggedInNow = loggedIn && !seen.loggedIn;
    const loggedOut = seen.logouts !== logouts;
    if ((loggedInNow && staleAfter(loaded, true)) || (loggedOut && staleAfter(loaded, false))) {
      reload();
    }
  }
}

// What the card loads when it shows and whenever `key` changes, and `reload`, which reads again. It reads again too
// when a login or the session's end leaves it out of date.
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
  useFollowFlag(loaded, reload);
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

// A login from anywhere takes away a write's line that asked for it; the write is not sent again by itself.
function useClearOnLogin(failure: CardFailure | null, setFailure: (failure: CardFailure | null) => void): void {
  const { loggedIn } = useLibrarySession();
  const [seen, setSeen] = useState(loggedIn);
  if (seen !== loggedIn) {
    setSeen(loggedIn);
    if (loggedIn && failure !== null && failure.failure !== null && needsLogin(failure.failure)) {
      setFailure(null);
    }
  }
}

// A card's write, sent only from its confirm button. `send` answers null when it was made, or what the card says.
// A failure is never sent again by itself; `onFailed` lets the card read again to show where things stand.
export function useWrite<Args>(
  send: (args: Args, press: ConfirmedPress) => Promise<CardFailure | null>,
  onFailed: (failure: LibraryFailure) => void = () => null,
  mark: PendingMark | null = null,
): Write<Args> {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<CardFailure | null>(null);
  const [pending, setPending] = useState<{ args: Args; press: ConfirmedPress } | null>(null);
  const logInThen = useLogInThen();
  useClearOnLogin(failure, setFailure);
  const attempt = async (args: Args, press: ConfirmedPress): Promise<void> => {
    setFailure(null);
    setBusy(true);
    mark?.start();
    try {
      const failed = await send(args, press);
      setFailure(failed);
      if (failed !== null) {
        mark?.clear();
      }
    } catch (error) {
      const kind = failureOf(error);
      mark?.clear();
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
  return { busy: busy || (mark?.pending ?? false), failure, run, logIn };
}

// The booking number of a booking made, shown on the phone only.
export function bseqnoOf(info: Readonly<Record<string, unknown>>): string {
  const { BSEQNO: bseqno } = info;
  return typeof bseqno === 'number' || typeof bseqno === 'string' ? String(bseqno) : '';
}

// What a library card does in the chat: it adds the app's own bubbles, such as the done message or the card a tapped
// seat gives, and keeps how it ended with the chat, by its place (`cardPlace`), so that it survives the sheet closing.
// A seat card keeps there too the room it shows in place of its own.
export interface LibraryCardActions {
  addOwn: (bubble: OwnBubble) => void;
  outcomeOf: (card: string) => CardOutcome | null;
  finish: (card: string, outcome: CardOutcome) => void;
  unfinish: (card: string) => void;
  roomOf: (card: string) => CardRoom | null;
  showRoom: (card: string, room: CardRoom | null) => void;
  // The User's words the bubble's answer was asked with.
  askedBefore: (bubbleId: number) => string;
  // How the seat card at a place tells the screen what it offers while the map draws its booking (P04 ticket 07); null
  // for any other card. Left out, none is drawn.
  onMap?: (card: string) => Tell | null;
  // Whether the time bar holds the band of the seat card at a place: a booking on the map alone; a step's card keeps its
  // own band (P04 ticket 09). Left out, none does.
  bandOnBar?: (card: string) => boolean;
}

// How a card's write is marked with the chat while it is on its way.
export interface PendingMark {
  // A write of this card is on its way, pressed in a sheet that may have closed since.
  pending: boolean;
  start: () => void;
  clear: () => void;
}

export const PENDING: CardOutcome = { kind: 'pending', words: '처리하는 중이에요' };

// The chat's mark of a card at `place`: set on the confirm press, replaced by the result, cleared on a failure.
export function pendingMark(actions: LibraryCardActions, place: string): PendingMark {
  return {
    pending: actions.outcomeOf(place)?.kind === 'pending',
    start: () => {
      actions.finish(place, PENDING);
    },
    clear: () => {
      actions.unfinish(place);
    },
  };
}

// The library's own words for a refused write.
export function libraryMessage(result: LibraryWriteResult): string {
  const fail = result.bookingFailInfo;
  const message = fail === undefined ? undefined : fail.msg;
  return typeof message === 'string' ? message : (result.msg ?? '');
}

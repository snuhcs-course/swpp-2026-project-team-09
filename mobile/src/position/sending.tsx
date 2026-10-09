/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactElement, type ReactNode, use, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { apiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import { LOBBY_KEY, lobbyQuery } from '@/api/queries';
import type { Lobby, PositionUpload } from '@/api/types';
import { POSITION_EVERY_MS } from './use-phone';
import { usePosition } from './use-position';

interface Uploader {
  // A newer position replaces one that waits.
  offer: (upload: PositionUpload) => void;
  start: () => void;
  // Nothing more is sent; an upload on its way finishes.
  stop: () => void;
}

// One upload at a time, and at most one every `POSITION_EVERY_MS`, even where the phone tells a position every second.
function createUploader(send: (upload: PositionUpload) => Promise<void>): Uploader {
  let on = false;
  let waiting: PositionUpload | null = null;
  let busy = false;
  let lastAt = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pump = (): void => {
    if (!on || busy || waiting === null || timer !== null) {
      return;
    }
    const wait = lastAt + POSITION_EVERY_MS - Date.now();
    if (wait > 0) {
      timer = setTimeout(() => {
        timer = null;
        pump();
      }, wait);
      return;
    }
    const upload = waiting;
    waiting = null;
    busy = true;
    lastAt = Date.now();
    void send(upload).finally(() => {
      busy = false;
      pump();
    });
  };
  return {
    offer: (upload): void => {
      waiting = upload;
      pump();
    },
    start: (): void => {
      on = true;
      pump();
    },
    stop: (): void => {
      on = false;
      waiting = null;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

// Whether the app is in front. It starts in front: the signed-in screens are shown when it starts.
function useInFront(): boolean {
  const [front, setFront] = useState(true);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setFront(state !== 'background');
    });
    return (): void => {
      listener.remove();
    };
  }, []);
  return front;
}

function masterSwitchOf(lobby: Lobby): boolean {
  return lobby.masterSwitch;
}

export interface Sending {
  // The last position the main server answered was off the Campus Boundary, so the User is not shared. It holds until
  // an upload is kept again.
  offCampus: boolean;
  // Stops the sending for good, before a sign-out.
  stop: () => void;
}

const SendingContext = createContext<Sending | null>(null);

// The uploads, and what the main server last answered. A refusal because the switch is off turns the switch off and
// fetches the Lobby again; any other refusal, and no answer, drops that position.
function useUploader(sending: boolean): { uploader: Uploader; offCampus: boolean } {
  const queryClient = useQueryClient();
  const [offCampus, setOffCampus] = useState(false);
  // What an answer arriving after the sending stopped leaves alone.
  const live = useRef(sending);
  useEffect(() => {
    live.current = sending;
  }, [sending]);
  const [uploader] = useState(() =>
    createUploader(async (upload) => {
      try {
        const kept = await apiClient.uploadPosition(upload);
        if (live.current) {
          setOffCampus(kept.offCampus);
        }
      } catch (error) {
        if (live.current && isRefusal(error, 409, 'MASTER_SWITCH_OFF')) {
          queryClient.setQueryData<Lobby>(LOBBY_KEY, (lobby) => lobby && { ...lobby, masterSwitch: false });
          void queryClient.invalidateQueries({ queryKey: LOBBY_KEY });
        }
      }
    }),
  );
  return { uploader, offCampus };
}

// Sends the User's position to the main server while the Master Switch is on, the permission is granted and the app
// is in front, so that Friends see the User's Avatar move. It stands inside the `PositionProvider` and reads its watch.
export function PositionSending({ children }: { children: ReactNode }): ReactElement {
  const { permission, position, accuracy, measuredAt } = usePosition();
  const switchOn = useQuery({ ...lobbyQuery, select: masterSwitchOf }).data === true;
  const front = useInFront();
  const [stopped, setStopped] = useState(false);
  const sending = switchOn && permission === 'granted' && front && !stopped;
  const { uploader, offCampus } = useUploader(sending);
  useEffect(() => {
    if (sending) {
      uploader.start();
    }
    return uploader.stop;
  }, [sending, uploader]);
  useEffect(() => {
    // A phone that does not say how accurate a position is has none the main server takes.
    if (sending && position !== null && accuracy !== null && measuredAt !== null) {
      uploader.offer({ ...position, accuracy, measuredAt: new Date(measuredAt).toISOString() });
    }
  }, [sending, position, accuracy, measuredAt, uploader]);
  const value = useMemo(
    (): Sending => ({
      offCampus,
      stop: (): void => {
        uploader.stop();
        setStopped(true);
      },
    }),
    [offCampus, uploader],
  );
  return <SendingContext value={value}>{children}</SendingContext>;
}

// What the sending around the screen says, and the way to stop it.
export function useSending(): Sending {
  const sending = use(SendingContext);
  if (sending === null) {
    throw new Error('The sending must be read inside PositionSending');
  }
  return sending;
}

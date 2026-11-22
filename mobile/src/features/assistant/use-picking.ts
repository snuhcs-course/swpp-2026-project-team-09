/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PickOffer, PickPlaceOffer, PickTimeOffer } from '@/api/pick-types';
import type { Place } from '@/api/types';
import type { Chat } from './use-chat';

// A Place or a time asked back (P04 ticket 26). 지도에서 고르기 turns the map into picking until a building is tapped,
// which sends the offer's words with that Place tapped, or until 그만 고르기. 시간 고르기 opens the time wheel, whose
// pick sends "HH:MM에" as the User's words. A new message ends either.
export interface Picking {
  place: PickPlaceOffer | null;
  time: PickTimeOffer | null;
  start: (offer: PickOffer) => void;
  stop: () => void;
  choosePlace: (place: Place) => void;
  chooseTime: (clock: string) => void;
}

export function usePicking({ send, bubbles }: Pick<Chat, 'send' | 'bubbles'>): Picking {
  const [place, setPlace] = useState<PickPlaceOffer | null>(null);
  const [time, setTime] = useState<PickTimeOffer | null>(null);
  const stop = useCallback((): void => {
    setPlace(null);
    setTime(null);
  }, []);
  useEffect(stop, [bubbles, stop]);
  const start = useCallback((offer: PickOffer): void => {
    if (offer.kind === 'pick-place') {
      setTime(null);
      setPlace(offer);
    } else {
      setPlace(null);
      setTime(offer);
    }
  }, []);
  const choosePlace = useCallback(
    ({ id }: Place): void => {
      if (place !== null) {
        stop();
        send(place.text, { kind: 'place', placeId: id });
      }
    },
    [place, send, stop],
  );
  const chooseTime = useCallback(
    (clock: string): void => {
      stop();
      send(`${clock}에`);
    },
    [send, stop],
  );
  return useMemo(
    () => ({ place, time, start, stop, choosePlace, chooseTime }),
    [place, time, start, stop, choosePlace, chooseTime],
  );
}

// The times of the wheel, every 10 minutes: from the next one on today, else from 07:00, to 23:50.
export function wheelTimes(date: string, today: string, nowClock: string): string[] {
  const times: string[] = [];
  for (let minutes = 7 * 60; minutes < 24 * 60; minutes += 10) {
    const clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    if (date !== today || clock > nowClock) {
      times.push(clock);
    }
  }
  return times;
}

// Whether a time is in the asker's Free Time.
export function isFreeAt(clock: string, free: PickTimeOffer['free']): boolean {
  return free.some(({ from, until }) => from <= clock && clock < until);
}

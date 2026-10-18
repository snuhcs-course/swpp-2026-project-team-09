/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { positionsQuery } from '@/api/queries';
import type { LatLng } from '@/api/types';
import { usePosition } from '@/position';
import type { RoomView } from './room-adapter';
import {
  type AskedRoute,
  asksRoute,
  metresBetween,
  placeKey,
  THERE_METRES,
  timeOf,
  walkingWords,
  type WalkingTime,
} from './walking-times';

// How often the room looks again whether a member's route may be asked: a member who moved within the minute of the
// last route gets the next one soon after the minute, without waiting to move once more.
const LOOK_EVERY_MS = 15_000;

type Times = Partial<Record<string, WalkingTime>>;

// Where each member who shares is: the User from the phone, the others from the positions the User sees.
function useWheres(room: RoomView, active: boolean): [string, LatLng][] {
  const positions = useQuery({ ...positionsQuery, enabled: active }).data;
  const mine = usePosition().position;
  return useMemo(
    () =>
      room.members.flatMap(({ id, me, state }): [string, LatLng][] => {
        if (state?.tone !== 'live') {
          return [];
        }
        const at = me ? mine : (positions?.find(({ userId }) => userId === id) ?? null);
        return at === null ? [] : [[id, { latitude: at.latitude, longitude: at.longitude }]];
      }),
    [room.members, positions, mine],
  );
}

function useLook(active: boolean): number {
  const [look, setLook] = useState(0);
  useEffect(() => {
    const timer = active
      ? setInterval(() => {
          setLook((count) => count + 1);
        }, LOOK_EVERY_MS)
      : null;
    return (): void => {
      if (timer !== null) {
        clearInterval(timer);
      }
    };
  }, [active]);
  return look;
}

interface Look {
  wheres: readonly [string, LatLng][];
  at: LatLng;
  to: string;
  asked: Map<string, AskedRoute>;
  shown: Readonly<Times>;
  set: (userId: string, time: WalkingTime | null) => void;
}

// Asks the member's route and shows what it says; a route that found none, or failed, is marked for its one retry.
function askRoute({ at, to, asked, set }: Look, userId: string, from: LatLng, entry: AskedRoute): void {
  asked.set(userId, entry);
  const failed = (): void => {
    asked.set(userId, { ...entry, failed: true });
    set(userId, null);
  };
  apiClient.findWalkingRoute(from, at).then((route) => {
    const time = timeOf(route, to);
    if (time === null) {
      failed();
    } else {
      set(userId, time);
    }
  }, failed);
}

// One look at the members: who is at the place, and whose route is asked again under the limits. A member who no
// longer shares, or whose position is gone, loses the time shown.
function lookAt(look: Look): void {
  const { wheres, at, to, asked, shown, set } = look;
  const nowMs = Date.now();
  const sharing = new Set(wheres.map(([userId]) => userId));
  for (const userId of Object.keys(shown)) {
    if (!sharing.has(userId) && shown[userId] !== undefined) {
      set(userId, null);
    }
  }
  for (const [userId, from] of wheres) {
    const before = shown[userId];
    if (metresBetween(from, at) <= THERE_METRES) {
      if (before?.there !== true || before.to !== to) {
        set(userId, { to, there: true });
      }
      continue;
    }
    const stale = before?.there === true;
    const asks = asksRoute(asked.get(userId), { from, to, nowMs, stale });
    if (asks === false) {
      if (stale) {
        set(userId, null);
      }
      continue;
    }
    askRoute(look, userId, from, { from, at: nowMs, to, failed: false, retry: asks === 'retry' });
  }
}

// The words each member's line adds after `위치 공유 중`, by member id, while the room is `open`:
// `{place}까지 도보 {n}분`, or `{place}에 있어요` within 50 m of it. A member without either shows none.
export function useWalkingTimes(room: RoomView, open: boolean): Partial<Record<string, string>> {
  const { destination } = room;
  const active = open && destination !== null;
  const wheres = useWheres(room, active);
  const look = useLook(active);
  const asked = useRef(new Map<string, AskedRoute>());
  const [times, setTimes] = useState<Times>({});
  // What is shown, for the looks: a route that comes back is no reason to look again.
  const shown = useRef<Times>({});
  const to = destination === null ? null : placeKey(destination.at);
  const target = useRef(destination?.at ?? null);
  target.current = destination?.at ?? null;
  useEffect(() => {
    const at = target.current;
    if (active && to !== null && at !== null) {
      lookAt({
        wheres,
        at,
        to,
        asked: asked.current,
        shown: shown.current,
        set: (userId, time) => {
          shown.current = { ...shown.current, [userId]: time ?? undefined };
          setTimes(shown.current);
        },
      });
    }
  }, [active, to, wheres, look]);
  if (destination === null || to === null) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(times).flatMap(([userId, time]) =>
      time === undefined || time.to !== to ? [] : [[userId, walkingWords(time, destination.label)]],
    ),
  );
}

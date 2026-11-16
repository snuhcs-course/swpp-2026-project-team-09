/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { shuttleQuery, shuttleVehiclesQuery } from '@/api/queries';
import type { ShuttleVehicle } from '@/api/shuttle-types';
import type { LatLng } from '@/api/types';
import { now } from '@/clock';
import { color, useToast } from '@/design-system';
import type { CardView } from '@/features/map/adapter';
import { useLayerFailureToast } from '@/features/map/use-layer-failure';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';
import type { MapLine } from '@/map';
import {
  CHECK_EVERY_MS,
  inService,
  NOT_IN_SERVICE,
  nextTravels,
  type ShuttleView,
  STALE_MS,
  STEP_MS,
  stepOn,
  toShuttleCards,
  toShuttleView,
  type Travel,
  travelling,
} from './adapter';

const FAILED = '셔틀버스 정보를 불러오지 못했어요';

// The line as the `Main` frame draws the shuttle's: purple, 3 wide, a dash of 8 after each gap of 6.
const LINE_STYLE = { color: color.svcShuttle, width: 3, dash: [8, 6] } as const;

const NOTHING: ShuttleLayer = { lines: [], cards: [], line: [] };
const NO_TRAVELS: readonly Travel[] = [];

export interface ShuttleLayer {
  lines: readonly MapLine[];
  // The stops' cards, then the vehicles'.
  cards: readonly CardView[];
  // The line's points, for "노선 보기".
  line: readonly LatLng[];
}

// Long enough for the two short facts the words hold.
const NOT_IN_SERVICE_MS = 3500;

// Says once, as a toast, that the shuttle is not in service: when the layer shows the route outside the service
// hours, and when the hours end while it is on.
function useNotInServiceToast(notInService: boolean): void {
  const showToast = useToast();
  const said = useRef(false);
  useEffect(() => {
    if (notInService && !said.current) {
      showToast(NOT_IN_SERVICE, NOT_IN_SERVICE_MS, 'bus');
    }
    said.current = notInService;
  }, [notInService, showToast]);
}

// The phone's clock, read when the layer is turned on and every `CHECK_EVERY_MS` while it is on.
function useCheckedAt(on: boolean): number {
  const [checkedAt, setCheckedAt] = useState(() => now().getTime());
  useEffect((): (() => void) | void => {
    if (!on) {
      return;
    }
    setCheckedAt(now().getTime());
    const timer = setInterval(() => {
      setCheckedAt(now().getTime());
    }, CHECK_EVERY_MS);
    return () => {
      clearInterval(timer);
    };
  }, [on]);
  return checkedAt;
}

// Where each vehicle is on the line. Each new set moves the vehicles, and every `STEP_MS` a travelling vehicle takes
// a step towards its stop. Without a route, none.
function useTravels(view: ShuttleView | null, vehicles: readonly ShuttleVehicle[]): readonly Travel[] {
  const glide = useMotionAllowed();
  const [travels, setTravels] = useState(NO_TRAVELS);
  useEffect(() => {
    setTravels((before) => (view === null ? NO_TRAVELS : nextTravels(before, vehicles, view, glide)));
  }, [view, vehicles, glide]);
  const moving = travels.some((travel) => travelling(travel));
  useEffect((): (() => void) | void => {
    if (!moving) {
      return;
    }
    const timer = setInterval(() => {
      setTravels((before) => before.map((travel) => stepOn(travel)));
    }, STEP_MS);
    return () => {
      clearInterval(timer);
    };
  }, [moving]);
  return travels;
}

// The shuttle layer while `on`: the route, fetched each time the layer is turned on, its line, its stops and the
// vehicles in service, which the socket's sets replace. A failure of the route shows nothing and says so; a failure
// of the vehicles alone leaves the route, and the vehicles come with the next set.
export function useShuttle(on: boolean): ShuttleLayer {
  const route = useQuery({ ...shuttleQuery, enabled: on, staleTime: 0 });
  const vehicles = useQuery({ ...shuttleVehiclesQuery, enabled: on, staleTime: 0 });
  useLayerFailureToast(on, route.errorUpdatedAt, FAILED);
  const checkedAt = useCheckedAt(on);
  const view = useMemo(
    () => (on && !route.isError && route.data !== undefined ? toShuttleView(route.data) : null),
    [on, route.isError, route.data],
  );
  const fresh = useMemo(
    () => (vehicles.data ?? []).filter(({ receivedAt }) => checkedAt - Date.parse(receivedAt) <= STALE_MS),
    [vehicles.data, checkedAt],
  );
  const travels = useTravels(view, fresh);
  useNotInServiceToast(view !== null && !inService(new Date(checkedAt)));
  return useMemo(() => {
    if (view === null) {
      return NOTHING;
    }
    return {
      lines: [{ id: 'shuttle', points: view.route.line, style: LINE_STYLE }],
      cards: toShuttleCards(view, travels),
      line: view.route.line,
    };
  }, [view, travels]);
}

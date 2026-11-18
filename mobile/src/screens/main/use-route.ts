/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useFocusEffect } from 'expo-router';
import { type RefObject, useCallback, useEffect, useEffectEvent, useMemo, useRef } from 'react';
import type { LatLng } from '@/api/types';
import { color, useToast } from '@/design-system';
import { useWalkingRoute } from '@/features/map/use-walking-route';
import { useNextQuest } from '@/features/quests/use-next-quest';
import type { LineStyle, MapLine } from '@/map';
import { ROUTE_PADDING } from './layout';
import type { MainMap } from './use-main-map';
import type { Me } from './use-me';

// The route line as the `Main` frame draws it: dots of the Quest's colour, 3 wide, a dash of 2 after each gap of 6.
export const ROUTE_STYLE: LineStyle = { color: color.quest, width: 3, dash: [2, 6] };

export const NO_WAY = '길을 찾지 못했어요';

export interface MainRoute {
  // For `<Map>`: the one route line, or null.
  line: MapLine | null;
  // "길찾기": draws the way from the User's position to the place, in place of the line that is drawn, brings both
  // ends into view and says "…까지 길 안내". Without a position to start from it draws nothing and answers false:
  // it shows the explanation before the location prompt when the permission is missing, and otherwise brings the
  // map to the place and says why, "캠퍼스 밖에 있어요" off campus. Nothing is drawn later for it either, when the
  // position comes: neither this way nor the opening one.
  routeTo: (place: { title: string; position: LatLng }) => boolean;
  // A tap on empty map (P15 ticket 55): drops the line that is drawn or on its way, whoever asked for it. A drawn
  // opening route is not drawn by itself again until the screen starts anew: it is asked once a start of the screen,
  // and the screen stays mounted while the app runs. With nothing drawn or asked it changes nothing: an opening route
  // still to come, such as before the first position, still comes. A "길찾기" draws again as before.
  clear: () => void;
}

// Calls back when the screen is left: it loses the focus or is closed.
function useLeaving(onLeave: () => void): void {
  const leave = useEffectEvent(onLeave);
  useFocusEffect(
    useCallback(
      () => (): void => {
        leave();
      },
      [],
    ),
  );
}

// `dismiss` drops the route that is drawn or on its way and any toast still to come for a route the User asked for
// (`wanted`): for a tap on empty map. It leaves the opening route alone when that was not asked yet, so a tap before the
// position comes keeps it coming. `leave` also drops the opening route still to come (`asked`): for leaving the screen.
function useDrops(
  clear: () => void,
  asked: RefObject<boolean>,
  wanted: RefObject<boolean>,
): { dismiss: () => void; leave: () => void } {
  const dismiss = useCallback((): void => {
    wanted.current = false;
    clear();
  }, [clear, wanted]);
  const leave = useCallback((): void => {
    asked.current = true;
    dismiss();
  }, [asked, dismiss]);
  return { dismiss, leave };
}

// The main screen's one route. When the screen opens, the way to the User's next Quest by time is drawn, once, as
// soon as the User has a position on campus; without one, none is. A "길찾기" replaces it, also one that could draw
// nothing. Leaving the screen drops whatever is drawn and the opening route that was still to come, and nothing is
// drawn by itself after that. `clear` drops what is drawn or on its way; the opening route, once asked, is not asked
// again, but one still to come still comes.
export function useRoute(map: MainMap, me: Me): MainRoute {
  const { route, isError, ask, clear } = useWalkingRoute();
  const showToast = useToast();
  const next = useNextQuest();
  const from = me.position;
  // The opening route is not drawn any more: it was asked for, a "길찾기" was pressed, or the screen was left.
  const asked = useRef(false);
  // The route at hand is one the User asked for: only that one says when no way is found.
  const wanted = useRef(false);
  useEffect(() => {
    if (!asked.current && from !== null && next !== null) {
      asked.current = true;
      ask(from, next.position);
    }
  }, [from, next, ask]);
  const { dismiss, leave } = useDrops(clear, asked, wanted);
  useLeaving(leave);
  const failed = isError || (route !== undefined && route.status !== 'OK');
  useEffect(() => {
    if (failed && wanted.current) {
      wanted.current = false;
      showToast(NO_WAY);
    }
  }, [failed, showToast]);
  const routeTo: MainRoute['routeTo'] = ({ title, position }) => {
    asked.current = true;
    if (me.permission === 'checking') {
      return false;
    }
    if (from === null) {
      if (!me.sayWhyNotHere()) {
        map.goTo(position, 'pins', true);
      }
      return false;
    }
    wanted.current = true;
    ask(from, position);
    map.fitTo([from, position], ROUTE_PADDING);
    showToast(`${title}까지 길 안내`);
    return true;
  };
  const line = useMemo(
    () => (route?.status === 'OK' ? { id: 'walking-route', points: route.route.line, style: ROUTE_STYLE } : null),
    [route],
  );
  return { line, routeTo, clear: dismiss };
}

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { menusQuery, placesQuery } from '@/api/queries';
import type { ScreenData } from '@/api/screen-data';
import { now } from '@/clock';
import { useToast } from '@/design-system';
import type { CardView } from '@/features/map/adapter';
import { koreaDateKey } from '@/korea-time';
import { type MenuDayView, toDiningCards, toMenuDay } from './adapter';

const NO_CARDS: readonly CardView[] = [];

const FAILED = '식당 정보를 불러오지 못했어요';

// Says once that a fetch of the layer failed. A failure from before the layer was turned on, such as the menu
// panel's, is not the layer's.
function useFailureToast(on: boolean, failedAt: number): void {
  const showToast = useToast();
  const seen = useRef(failedAt);
  useEffect(() => {
    if (on && failedAt > seen.current) {
      showToast(FAILED);
    }
    seen.current = failedAt;
  }, [on, failedAt, showToast]);
}

// The pins of the 식당 layer, each with its card, while `on`: today's menus and the Places, fetched each time the
// layer is turned on. Until both have answered, and after a failure of either, none.
export function useDiningCards(on: boolean): readonly CardView[] {
  const today = koreaDateKey(now());
  const menus = useQuery({ ...menusQuery(today), enabled: on, staleTime: 0 });
  const places = useQuery({ ...placesQuery, enabled: on, staleTime: 0 });
  useFailureToast(on, Math.max(menus.errorUpdatedAt, places.errorUpdatedAt));
  const failed = menus.isError || places.isError;
  return useMemo(
    () =>
      on && !failed && menus.data !== undefined && places.data !== undefined
        ? toDiningCards(menus.data, places.data)
        : NO_CARDS,
    [on, failed, menus.data, places.data],
  );
}

// One day's menus for the menu panel, "2026-10-06", asked once per day while the cache keeps it.
export function useMenuDay(date: string): ScreenData<MenuDayView> {
  const { data, isPending, isError, refetch } = useQuery({ ...menusQuery(date), select: toMenuDay });
  return {
    data,
    isPending,
    isError,
    refetch: () => {
      void refetch();
    },
  };
}

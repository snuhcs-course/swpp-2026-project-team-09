/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { LibrarySpace } from '@/api/assistant-types';
import { studySpacesQuery } from '@/api/queries';
import { now } from '@/clock';
import type { CardView } from '@/features/map/adapter';
import { useLayerFailureToast } from '@/features/map/use-layer-failure';
import { siteBookTime, siteDate } from '@/library/cards/times';
import { library } from '@/library/library';
import { useLibrarySession } from '@/library/library-session';
import { seatCount, slotNow, toStudyCards } from './adapter';

const NO_CARDS: readonly CardView[] = [];

const FAILED = '공부공간 정보를 불러오지 못했어요';

// The pins of the 공부공간 layer, each with its card, while `on`: the buildings, asked again each time the layer is
// turned on, since they follow 내 정보. Until they answer, and after a failure, none.
export function useStudyCards(on: boolean): readonly CardView[] {
  const { data, isError, errorUpdatedAt } = useQuery({ ...studySpacesQuery, enabled: on, staleTime: 0 });
  useLayerFailureToast(on, errorUpdatedAt, FAILED);
  return useMemo(() => (on && !isError && data !== undefined ? toStudyCards(data) : NO_CARDS), [on, isError, data]);
}

// 관정관's seats as its card shows them: without a Library Session, `loggedOut`, and nothing is asked of the library;
// with one, the free and the total seats of the sectors bookable now, read by the phone and kept on it. A failed read,
// or no sector bookable now, is `none`: the card shows the hours alone.
export type LiveSeats =
  { state: 'loggedOut' } | { state: 'loading' } | { state: 'none' } | { state: 'counted'; free: number; total: number };

async function countSeats(sectors: readonly LibrarySpace[]): Promise<LiveSeats> {
  const at = now();
  const reads = sectors.flatMap((sector) => {
    const slot = slotNow(sector, at);
    return slot === null
      ? []
      : [
          library.seats({
            roomNo: sector.roomNo,
            sectorNo: sector.sectorNo,
            useTime: slot.minutes,
            bookDate: siteDate(slot.date),
            bookTime: siteBookTime(slot.start, slot.minutes),
          }),
        ];
  });
  if (reads.length === 0) {
    return { state: 'none' };
  }
  return { state: 'counted', ...seatCount(await Promise.all(reads)) };
}

export function useLiveSeats(sectors: readonly LibrarySpace[] | null): LiveSeats | null {
  const { loggedIn } = useLibrarySession();
  const [seats, setSeats] = useState<LiveSeats>({ state: 'loading' });
  useEffect(() => {
    let current = true;
    if (sectors === null || !loggedIn) {
      return (): void => {
        current = false;
      };
    }
    setSeats({ state: 'loading' });
    countSeats(sectors).then(
      (counted) => {
        if (current) {
          setSeats(counted);
        }
      },
      () => {
        if (current) {
          setSeats({ state: 'none' });
        }
      },
    );
    return (): void => {
      current = false;
    };
  }, [sectors, loggedIn]);
  if (sectors === null) {
    return null;
  }
  return loggedIn ? seats : { state: 'loggedOut' };
}

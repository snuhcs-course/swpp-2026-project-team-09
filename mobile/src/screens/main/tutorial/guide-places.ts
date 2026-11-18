/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { placesQuery } from '@/api/queries';
import type { LatLng } from '@/api/types';
import type { TutorialGuidePlace } from '@/api/tutorial-types';

// Where a guide's place is: a point as it is, a Place of the list by its number. A Place the list does not hold has
// no position, and no pin.
export function useGuidePositions(): (place: TutorialGuidePlace) => LatLng | null {
  const places = useQuery(placesQuery).data;
  return useCallback(
    (place: TutorialGuidePlace): LatLng | null => {
      if ('point' in place) {
        return place.point;
      }
      const found = places?.find(({ number }) => number === place.place);
      return found === undefined ? null : { latitude: found.latitude, longitude: found.longitude };
    },
    [places],
  );
}

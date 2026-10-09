// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by AhnJinYoung
import { useQuery } from '@tanstack/react-query';
import { footprintsQuery } from '@/api/queries';
import { type FootprintsView, NO_FOOTPRINTS, toFootprintsView } from './adapter';

// What "오늘의 발자국" shows on the main screen. It is the app's own and never fails a screen: while it is loading, and
// when it failed, the button has its name alone.
export function useFootprints(): FootprintsView {
  return useQuery({ ...footprintsQuery, select: toFootprintsView }).data ?? NO_FOOTPRINTS;
}

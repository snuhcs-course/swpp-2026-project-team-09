/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo, useState } from 'react';
import type { TimeBand as TimeBandData } from '@/api/assistant-types';
import { type BandBound, clockOf, onBandDay } from '@/features/assistant/time-band';
import type { HeldBand } from './band-body';

// A handle moved by a drag, or let go and held while the recalculation it asked for is on its way.
export interface Moved {
  bound: BandBound;
  clock: string;
}

export interface MovedBand extends HeldBand {
  onMove: (moved: Moved) => void;
  onLetGo: (moved: Moved) => void;
  onCancel: () => void;
}

// The band as drawn: the Plan's, or with a handle where it is dragged, or where it was let go until the
// recalculation it asked for ends or a new band comes.
export function useMovedBand(
  band: TimeBandData,
  disabled: boolean,
  onDrop: (bound: BandBound, time: string) => void,
): MovedBand {
  const [moved, setMoved] = useState<Moved | null>(null);
  const [seen, setSeen] = useState({ band, disabled });
  if (seen.band !== band || seen.disabled !== disabled) {
    setSeen({ band, disabled });
    if (seen.band !== band || !disabled) {
      setMoved(null);
    }
  }
  const handlers = useMemo(
    () => ({
      onMove: (next: Moved): void => {
        if (!disabled) {
          setMoved(next);
        }
      },
      onCancel: (): void => {
        if (!disabled) {
          setMoved(null);
        }
      },
      onLetGo: (next: Moved): void => {
        if (disabled) {
          return;
        }
        const own = clockOf(next.bound === 'from' ? band.startAt : band.endAt);
        setMoved(next.clock === own ? null : next);
        if (next.clock !== own) {
          onDrop(next.bound, next.clock);
        }
      },
    }),
    [band, disabled, onDrop],
  );
  const shown = {
    startAt: moved?.bound === 'from' ? onBandDay(moved.clock, band) : band.startAt,
    endAt: moved?.bound === 'until' ? onBandDay(moved.clock, band) : band.endAt,
  };
  return { shown, bound: moved?.bound ?? null, ...handlers };
}

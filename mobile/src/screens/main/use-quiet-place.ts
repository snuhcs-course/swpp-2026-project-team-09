/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useMemo, useState } from 'react';
import type { AnswerReply } from '@/api/assistant-types';
import { drawsMeal } from '@/features/assistant/meal-marks';
import { quietWords } from '@/features/assistant/quiet-places';
import { type MapTap, useMapTap } from './tutorial/use-map-tap';
import type { MapTouches } from './use-pressed-place';

// A press on a quiet place of a meal answer's map (P04 ticket 70): a place that cannot be done shows its name and the
// reason the list gives beside its dot. A press on another mark, a tap anywhere else on the map, another Plan on
// screen, or another answer takes it away.

const NO_WORDS: ReadonlyMap<string, string> = new Map();

interface Opened {
  answer: AnswerReply | null;
  index: number;
  id: string;
}

export interface QuietPlace {
  // The mark whose words show, null for none.
  opened: string | null;
  // Whether a mark is a quiet place that takes a press.
  takes: (id: string) => boolean;
  // A press on a mark: true when it was a quiet place's, which it opens; any other press closes the one open.
  press: (id: string) => boolean;
  // For the View around the map: a tap on it that no mark's press keeps closes the one open.
  touches: MapTap['touches'];
}

// The quiet place pressed on the map of the answer on screen, at the Plan at `index`. Nothing opens once the Plan is
// sent (`sent`).
export function useQuietPlace(answer: AnswerReply | null, index: number, sent: boolean): QuietPlace {
  const words = useMemo(() => (answer === null || !drawsMeal(answer) ? NO_WORDS : quietWords(answer)), [answer]);
  const [stored, setStored] = useState<Opened | null>(null);
  const opened = stored !== null && stored.answer === answer && stored.index === index ? stored.id : null;
  const close = useCallback(() => {
    setStored(null);
  }, []);
  const tap = useMapTap(close, opened !== null);
  const { keep } = tap;
  const takes = useCallback((id: string) => !sent && words.has(id), [sent, words]);
  const press = useCallback(
    (id: string) => {
      keep();
      if (takes(id)) {
        setStored({ answer, index, id });
        return true;
      }
      setStored(null);
      return false;
    },
    [keep, takes, answer, index],
  );
  return { opened, takes, press, touches: tap.touches };
}

// Which marks of a Plan take a press: a quiet place's, and those `pressable` takes.
export function pressableWith(quiet: QuietPlace, pressable: (id: string) => boolean): (id: string) => boolean {
  return (id) => quiet.takes(id) || pressable(id);
}

// A press on the map: a quiet place's opens it (`QuietPlace.press`), any other closes it and goes on to `onPlan`.
export function quietFirst(quiet: QuietPlace, onPlan: (id: string) => void): (id: string) => void {
  return (id) => {
    if (!quiet.press(id)) {
      onPlan(id);
    }
  };
}

// The touches around the map with a quiet place's tap watcher beside them, when one watches.
export function withQuietTouches(around: MapTouches, more: MapTap['touches'] | undefined): MapTouches {
  if (more === undefined) {
    return around;
  }
  return {
    onTouchStart: (event) => {
      around.onTouchStart(event);
      more.onTouchStart(event);
    },
    onTouchEnd: (event) => {
      around.onTouchEnd(event);
      more.onTouchEnd(event);
    },
    onTouchCancel: () => {
      around.onTouchCancel();
      more.onTouchCancel();
    },
    onLayout: around.onLayout,
  };
}

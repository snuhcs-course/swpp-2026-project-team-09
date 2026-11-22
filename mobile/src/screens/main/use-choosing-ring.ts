/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerSymbol } from '@/design-system';
import type { LabelView } from '@/features/assistant/answer-labels';
import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';
import type { MarkerLook } from '@/map';

// Choosing a place (the answer screen's redesign, board E2): the pick's dot pops and a ring spreads from it twice and
// stops; none with reduced motion. A map marker is a picture, so the ring is a short run of pictures, each made when
// the answer comes so that the pick never waits for one.

// How far the ring has spread at each step, twice over.
const STAGES = [0.2, 0.6, 1] as const;
const RUN = [...STAGES, ...STAGES];
const STEP_MS = 110;

type Dot = Extract<AnswerSymbol, { type: 'dot' }>;

function ringed(symbol: Dot, ring: number): Dot {
  return { ...symbol, ring, pop: true };
}

function isPickDot(look: MarkerLook): look is MarkerLook & { kind: 'answer'; symbol: Dot } {
  return look.kind === 'answer' && look.symbol?.type === 'dot' && look.symbol.role === 'pick';
}

// The step of the run after `key` changed (a new pick), or null when none runs.
function useStep(key: unknown): number | null {
  const motion = useMotionAllowed();
  const [step, setStep] = useState<number | null>(null);
  const last = useRef(key);
  useEffect(() => {
    const run = last.current !== key && motion ? RUN : [];
    last.current = key;
    const timers = run.map((_, at) =>
      setTimeout(() => {
        setStep(at);
      }, STEP_MS * at),
    );
    if (run.length > 0) {
      timers.push(
        setTimeout(() => {
          setStep(null);
        }, STEP_MS * run.length),
      );
    }
    return (): void => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [key, motion]);
  return step;
}

type Draw = (view: LabelView | null) => AnswerDrawing;

// The drawing with the pick's ring at its step while one runs after a new pick (`key`), and the looks with every
// pick's ring pictures beside them.
export function useChoosingRing(
  draw: Draw | null,
  looks: readonly MarkerLook[],
  key: unknown,
): { draw: Draw | null; looks: readonly MarkerLook[] } {
  const step = useStep(key);
  const ring = step === null ? undefined : RUN[step];
  const shown = useMemo((): Draw | null => {
    if (draw === null || ring === undefined) {
      return draw;
    }
    return (view) => {
      const drawing = draw(view);
      const things = drawing.things.map((thing) =>
        isPickDot(thing.look) ? { ...thing, look: { ...thing.look, symbol: ringed(thing.look.symbol, ring) } } : thing,
      );
      return { ...drawing, things };
    };
  }, [draw, ring]);
  const all = useMemo(() => {
    const rings: MarkerLook[] = [];
    for (const look of looks) {
      if (isPickDot(look)) {
        for (const at of STAGES) {
          rings.push({ ...look, symbol: ringed(look.symbol, at) });
        }
      }
    }
    return [...looks, ...rings];
  }, [looks]);
  return { draw: shown, looks: all };
}

/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useEffectEvent, useRef } from 'react';
import type { LabelView } from '@/features/assistant/answer-labels';
import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import type { Framing } from './answer-framing';
import { paddingOf } from './answer-padding';
import type { MapCamera } from '@/map';
import type { MainMap } from './use-main-map';

// When the camera frames what an answer draws on the map, for every kind of answer: once for each event that asks
// for it, and never in between (P10 ticket 30, the user's words: "최초 질의 혹은 클릭 이후 줌 세팅이 된 이후에는 마음대로
// 움직일 수 있어야 하는거야"). The events are a new reply, and a press that opens or chooses something: a candidate, a
// mark, a step, a place opened, the list again. Nothing else frames: not the phone's position, a poll, the card's height,
// the keyboard, or a recalculation that keeps the places.

// What a framing is of, part by part, each compared with `Object.is`: the reply or answer drawn (`reply`), and what was
// opened or chosen in it (`chosen`).
export interface FrameKey {
  reply: unknown;
  chosen: readonly unknown[];
}

// A drawing's framing: its key; the object it is drawn from, a reply or an answer, which once it changes with the key
// has the framing wait for the card's layout (`from`); and whether the map shows this drawing, not another one over it
// (`active`).
export interface Frame {
  key: FrameKey;
  from?: unknown;
  active?: boolean;
}

// How long the card's height and the stage stay the same before the camera frames a new reply or answer: the card is
// laid out again after it comes, and the camera moves once for both.
const STILL_MS = 120;

export function sameKey(one: FrameKey | null, other: FrameKey): boolean {
  return (
    one !== null &&
    Object.is(one.reply, other.reply) &&
    one.chosen.length === other.chosen.length &&
    one.chosen.every((part, at) => Object.is(part, other.chosen[at]))
  );
}

// The glide to the camera the drawing's labels were placed at; until the stage is laid out and the map has told its fit
// zoom, a fit the map works out itself. True for the glide, which ends the framing once the camera rests after it.
function showDrawing(drawing: AnswerDrawing | null, shown: LabelView | null, map: MainMap, framing: Framing): boolean {
  if (drawing === null || drawing.points.length === 0) {
    return false;
  }
  if (framing.view === null) {
    map.fitAnswer(drawing.points, paddingOf(framing.top, framing.card, drawing, framing.pill, framing.timeBar));
    return false;
  }
  if (shown === null) {
    return false;
  }
  map.moveTo(shown.camera);
  return true;
}

interface FramingState {
  // The key last framed; null before the first framing.
  framed: FrameKey | null;
  // Whether the drawing was on the map at the last render, and what it was drawn from then.
  drawn: boolean;
  seen: unknown;
  // A framing follows the card's height and the stage, its own layout, until the camera first rests after its glide.
  open: boolean;
  // The camera the map rested at when the framing's glide was sent, which a rest after the glide differs from; undefined
  // before the glide.
  glidedFrom: MapCamera | null | undefined;
  // The layout the drawing was last framed for.
  laidOut: Framing | null;
  timer: ReturnType<typeof setTimeout> | null;
}

// What the camera does when the drawing is framed, and when the framing waits `STILL_MS` first.
interface Moves {
  glide: () => void;
  later: () => void;
  stop: () => void;
}

function movesOf(state: { current: FramingState }, glideNow: () => boolean, camera: () => MapCamera | null): Moves {
  const stop = (): void => {
    const { timer } = state.current;
    if (timer !== null) {
      clearTimeout(timer);
      state.current.timer = null;
    }
  };
  const glide = (): void => {
    if (glideNow()) {
      state.current.glidedFrom = camera();
    }
  };
  const later = (): void => {
    stop();
    state.current.timer = setTimeout(() => {
      state.current.timer = null;
      glide();
    }, STILL_MS);
  };
  return { glide, later, stop };
}

// An event, when the drawing is on the map (`here`) and is new there or framed for another key: at once for a press, or
// once its layout has stayed the same for `STILL_MS` when it is drawn from a new reply or answer.
function framedAgain(now: FramingState, here: boolean, { key, from }: Frame, moves: Moves): void {
  const came = here && !now.drawn;
  const replied = now.seen !== undefined && now.seen !== null && !Object.is(now.seen, from);
  Object.assign(now, { drawn: here, seen: from });
  if (!here || (!came && sameKey(now.framed, key))) {
    return;
  }
  Object.assign(now, { framed: key, open: true, glidedFrom: undefined });
  if (replied) {
    moves.later();
  } else {
    moves.stop();
    moves.glide();
  }
}

// A change of the card's height or the stage: framed again while the framing is open, never after.
function laidOutAgain(now: FramingState, here: boolean, framing: Framing, moves: Moves): void {
  if (!now.open || !here || now.laidOut === framing) {
    return;
  }
  if (now.timer === null) {
    moves.glide();
  } else {
    moves.later();
  }
}

const NOTHING_FRAMED: FramingState = {
  framed: null,
  drawn: false,
  seen: undefined,
  open: false,
  glidedFrom: undefined,
  laidOut: null,
  timer: null,
};

// Frames the drawing on each event (`Frame`). Until the camera first rests after the framing's glide, a change of the
// card's height or the stage frames it again; from then on the camera is the User's until the next event. A drawing
// that comes onto the map, or becomes the one it shows, is such an event; none moves nothing, so closing the answer
// leaves the camera where it is.
export function useFramedCamera(
  drawing: AnswerDrawing | null,
  shown: LabelView | null,
  frame: Frame,
  map: MainMap,
  framing: Framing,
): void {
  const state = useRef<FramingState>({ ...NOTHING_FRAMED });
  const glideNow = (): boolean => {
    state.current.laidOut = framing;
    return showDrawing(drawing, shown, map, framing);
  };
  const moves = movesOf(state, glideNow, () => map.camera);
  const here = frame.active !== false && drawing !== null;
  const onEvent = useEffectEvent(() => {
    framedAgain(state.current, here, frame, moves);
  });
  const onLayout = useEffectEvent(() => {
    laidOutAgain(state.current, here, framing, moves);
  });
  const onRest = useEffectEvent(() => {
    const { glidedFrom } = state.current;
    if (glidedFrom !== undefined && map.camera !== glidedFrom) {
      state.current.open = false;
    }
  });
  // Each render compares what is drawn with what was last framed.
  useEffect(() => {
    onEvent();
  });
  useEffect(() => {
    onLayout();
  }, [framing]);
  useEffect(() => {
    onRest();
  }, [map.camera]);
  useEffect(() => moves.stop, []);
}

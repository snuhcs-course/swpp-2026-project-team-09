/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerReply, PlacePoint } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import type { LocationMissing } from '@/api/refusal-types';
import type { LatLng, Place } from '@/api/types';
import { askingAnswer, fixedAt, pointOf, titleOf } from './how-about';
import type { PlanInvitation } from './use-plan-invitation';
import type { ShownAnswer } from './use-shown-answer';

// "여기면 어때?" (P02 ticket 26): while a meal's Plan is on screen, a pressed building is asked about with the conditions
// on screen fixed to it; the answer on screen stays underneath, unchanged, until "여기로 바꾸기".

export interface HowAbout {
  // A meal's Plan is on screen and was not sent: a press on a building asks about it.
  pressable: boolean;
  // The pressed Place, and its point as the map draws it; null while none is asked about.
  place: Place | null;
  point: PlacePoint | null;
  // The Place as the pill and the card name it: the answer's when it came, else the building's.
  title: string | null;
  // The answer for it, null while it is on its way.
  reply: AnswerReply | null;
  // The press on a building, and the Place pressed, as the building press takes them.
  target: { place: Place | null; selectPlace: (place: Place) => void };
  // "그대로", the pill's ✕, and Android's back: the Plan on screen as it was, without a request.
  keep: () => void;
  // "여기로 바꾸기": the conditions on screen with the Place fixed, recalculated in place of the answer on screen.
  change: () => void;
}

interface Asked {
  place: Place;
  reply: AnswerReply | null;
  // The answer on screen it was asked over: another answer on screen closes it.
  over: AnswerReply;
}

// Where the User is, which the recalculation sends, and what a failed one says.
export interface HowAboutAsk {
  location: LatLng | null;
  locationMissing: LocationMissing;
  onFailed: () => void;
}

function useAsked(
  answer: AnswerReply | null,
  ask: HowAboutAsk,
): { open: Asked | null; press: (place: Place) => void; keep: () => void } {
  const [asked, setAsked] = useState<Asked | null>(null);
  const live = useRef({ answer, ask, asked });
  useEffect(() => {
    live.current = { answer, ask, asked };
  });
  const press = useCallback((place: Place): void => {
    const over = live.current.answer;
    const input = over === null ? null : fixedAt(over.input, place.id);
    if (over === null || input === null) {
      return;
    }
    const mine: Asked = { place, reply: null, over };
    live.current.asked = mine;
    setAsked(mine);
    const { location, locationMissing, onFailed } = live.current.ask;
    apiClient.recalculateAnswer(input, location, locationMissing).then(
      (reply) => {
        if (live.current.asked === mine) {
          setAsked({ ...mine, reply });
        }
      },
      () => {
        if (live.current.asked === mine) {
          setAsked(null);
          onFailed();
        }
      },
    );
  }, []);
  const keep = useCallback((): void => {
    live.current.asked = null;
    setAsked(null);
  }, []);
  return { open: asked !== null && asked.over === answer ? asked : null, press, keep };
}

// The Place asked about over the answer on screen. A new answer on screen, a recalculation's included, closes it.
export function useHowAbout(
  shown: ShownAnswer,
  { made, sending, left }: Pick<PlanInvitation, 'made' | 'sending' | 'left'>,
  ask: HowAboutAsk,
): HowAbout {
  const { answer, plan, change: recalculate } = shown;
  const { open, press, keep } = useAsked(answer, ask);
  // 그대로 두기 settles the answer as a Plan made does (P04 ticket 20).
  const pressable =
    answer !== null && plan !== null && answer.input.kind === 'meal' && made === null && left === null && !sending;
  const place = open?.place ?? null;
  const reply = open?.reply ?? null;
  const point = useMemo(() => (place === null ? null : pointOf(place)), [place]);
  const target = useMemo(() => ({ place, selectPlace: press }), [place, press]);
  return {
    pressable,
    place,
    point,
    title: place === null ? null : titleOf(place, reply),
    reply,
    target,
    keep,
    change: () => {
      if (place !== null) {
        keep();
        recalculate((input) => fixedAt(input, place.id) ?? input);
      }
    },
  };
}

// The answer on screen as the map draws it while a Place is asked about: the Plan on screen's scene in its place.
export function useAskingShown(shown: ShownAnswer, point: PlacePoint | null): ShownAnswer {
  const { answer, index } = shown;
  const asking = useMemo(
    () => (answer === null || point === null ? null : askingAnswer(answer, index, point)),
    [answer, index, point],
  );
  return asking === null ? shown : { ...shown, answer: asking, plan: asking.plans[index] ?? null };
}

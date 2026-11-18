/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import type { LatLng } from '@/api/types';
import type { Tutorial, TutorialGuide, TutorialGuidePlace, TutorialStep } from '@/api/tutorial-types';
import { type GuidePosition, isChoosing, placesOf, stepAt, stepsAtOnePlace, stepsOf } from '@/features/tutorial/guide';
import { type MapCamera, type MapLine, type MapMarker, type MarkerLook, useMarkerImages } from '@/map';
import type { Room } from '../layout';
import type { MainMap } from '../use-main-map';
import { useGuidePositions } from './guide-places';
import { toneOf } from './tone';
import type { GuideView } from './use-guide-flow';
import type { TutorialFlow } from './use-tutorial-flow';

// What the map draws while a quest's guide is open (the canvas's `MainTut*` boards): the guide's places as its pins,
// and, for numbered steps, the way from the User through them; nothing else of the everyday map but the User. The
// camera fits every place of the guide, and the User unless the guide leaves them out, once as the guide opens and as a
// kind is chosen: the map stays as the steps change.

export const GUIDE_PIN = 'tutorial-guide:';

interface Pin {
  id: string;
  look: MarkerLook;
  position: LatLng;
  label?: string;
  // A step's pin shows that step; a spot's, that spot.
  step?: number;
  spot?: number;
}

type PositionOf = (place: TutorialGuidePlace) => LatLng | null;

// While choosing a kind: every kind's places, small, with their names.
function choicePins(guide: TutorialGuide, ink: string, positionOf: PositionOf): Pin[] {
  const seen = new Set<string>();
  return (guide.kinds ?? []).flatMap(({ steps }) =>
    steps.flatMap(({ place, name }): Pin[] => {
      const position = place === undefined ? null : positionOf(place);
      const key = position === null ? '' : `${String(position.latitude)},${String(position.longitude)}`;
      if (position === null || seen.has(key)) {
        return [];
      }
      seen.add(key);
      return [
        { id: `${GUIDE_PIN}kind:${key}`, look: { kind: 'tutorialStep', shape: 'dot', ink }, position, label: name },
      ];
    }),
  );
}

// One pin for the steps at one place: the step shown large, a passed one with ✓, one still to come faint; a guide of
// places side by side shows each step's sign and never ✓.
function stepPins(guide: TutorialGuide, position: GuidePosition, ink: string, positionOf: PositionOf): Pin[] {
  const steps = stepsOf(guide, position.kind);
  const now = stepAt(guide, position)?.index ?? 0;
  const together = guide.together === true;
  return stepsAtOnePlace(steps).flatMap((group): Pin[] => {
    const first = group[0] ?? 0;
    const shown = group.includes(now);
    const at = shown ? now : first;
    const step: TutorialStep | undefined = steps[at];
    const place = step?.place === undefined ? null : positionOf(step.place);
    if (step === undefined || place === null) {
      return [];
    }
    const past = !together && (group.at(-1) ?? 0) < now;
    const words = step.pinText ?? String(at + 1);
    const look: MarkerLook = { kind: 'tutorialStep', shape: shown ? 'now' : past ? 'past' : 'step', ink, words };
    return [
      {
        id: `${GUIDE_PIN}step:${String(at)}`,
        look: !together && first > now ? { ...look, later: true } : look,
        position: place,
        ...(shown || step.name === undefined ? {} : { label: step.name }),
        step: at,
      },
    ];
  });
}

// The spots of the step shown, the shown one with its ring, each with its name.
function spotPins(guide: TutorialGuide, position: GuidePosition, ink: string, positionOf: PositionOf): Pin[] {
  const spots = stepAt(guide, position)?.step.spots ?? [];
  return spots.flatMap((spot, at): Pin[] => {
    const place = spot.place === undefined ? null : positionOf(spot.place);
    return place === null
      ? []
      : [
          {
            id: `${GUIDE_PIN}spot:${String(at)}`,
            look: { kind: 'tutorialStep', shape: at === position.spot ? 'spotNow' : 'spot', ink },
            position: place,
            label: spot.name,
            spot: at,
          },
        ];
  });
}

// The way from the User through the numbered steps' places: the leg to the step shown in short dots, the others in
// dashes.
function wayOf(
  guide: TutorialGuide,
  position: GuidePosition,
  ink: string,
  me: LatLng | null,
  positionOf: PositionOf,
): MapLine[] {
  if (guide.together === true || isChoosing(guide, position.kind) || me === null) {
    return [];
  }
  const now = stepAt(guide, position)?.index ?? 0;
  let from = me;
  return stepsOf(guide, position.kind).flatMap(({ place }, at): MapLine[] => {
    const to = place === undefined ? null : positionOf(place);
    if (to === null) {
      return [];
    }
    const leg: MapLine = {
      id: `${GUIDE_PIN}way:${String(at)}`,
      points: [from, to],
      style: at === now ? { color: ink, width: 4, dash: [1, 8] } : { color: ink, width: 3, dash: [6, 6] },
    };
    from = to;
    return [leg];
  });
}

export interface GuideMap {
  markers: MapMarker[];
  lines: MapLine[];
  onPress: (id: string) => void;
}

interface GuideMapDeps {
  flow: TutorialFlow;
  map: MainMap;
  room: Room;
  me: LatLng | null;
  // The walking route of a 길찾기, drawn over the way.
  route: MapLine | null;
  // The answer frame, or a card nobody asked for, is shown.
  framed: boolean;
}

function pinsOf(
  tutorial: Tutorial,
  view: GuideView,
  positionOf: PositionOf,
): { pins: Pin[]; guide: TutorialGuide } | null {
  const quest = tutorial.quests.find(({ key }) => key === view.key);
  const guide = quest?.guide;
  if (quest === undefined || guide === undefined) {
    return null;
  }
  const { ink } = toneOf(tutorial, quest.category);
  const pins = isChoosing(guide, view.kind)
    ? choicePins(guide, ink, positionOf)
    : [...stepPins(guide, view, ink, positionOf), ...spotPins(guide, view, ink, positionOf)];
  return { pins, guide };
}

// The camera's fit: the places between the bubble and the panel.
function useGuideCamera(
  guide: TutorialGuide | null,
  view: GuideView | null,
  deps: GuideMapDeps,
  positionOf: PositionOf,
): void {
  const { map, room, me } = deps;
  const fit = useEffectEvent(() => {
    if (guide === null) {
      return;
    }
    const places = placesOf(guide).flatMap((place) => positionOf(place) ?? []);
    const points = guide.withoutUser === true || me === null ? places : [...places, me];
    const height = room.stage?.height ?? 760;
    const together = guide.together === true;
    if (points.length > 0) {
      map.fitTo(points, {
        top: Math.round(height * (together ? 0.44 : 0.48)),
        right: 48,
        bottom: together ? 150 : 180,
        left: 48,
      });
    }
  });
  const key = view === null ? null : `${view.key}:${view.kind ?? ''}`;
  useEffect(() => {
    if (key !== null) {
      fit();
    }
  }, [key, guide === null]);
}

// Closing a guide brings the map back to where the everyday map was when the guide opened, as the answer frame's way
// out does (`use-camera-back.ts`), unless the guide gave way to the answer frame, whose own way back then follows.
function useGuideCameraBack(open: boolean, { map, framed }: Pick<GuideMapDeps, 'map' | 'framed'>): void {
  const everyday = useRef<MapCamera | null>(null);
  const wasOpen = useRef(false);
  const remember = useEffectEvent(() => {
    everyday.current = map.camera;
  });
  const goBack = useEffectEvent(() => {
    if (everyday.current !== null && !framed) {
      map.moveTo(everyday.current);
    }
    everyday.current = null;
  });
  useEffect(() => {
    if (open && !wasOpen.current) {
      remember();
    } else if (!open && wasOpen.current) {
      goBack();
    }
    wasOpen.current = open;
  }, [open]);
}

export function useGuideMap(deps: GuideMapDeps): GuideMap | null {
  const { flow, me } = deps;
  const { tutorial, guide: view } = flow;
  const positionOf = useGuidePositions(view !== null);
  const drawn = useMemo(
    () => (tutorial === undefined || view === null ? null : pinsOf(tutorial, view, positionOf)),
    [tutorial, view, positionOf],
  );
  const images = useMarkerImages(drawn?.pins.map(({ look }) => look) ?? []);
  useGuideCameraBack(view !== null, deps);
  useGuideCamera(drawn?.guide ?? null, view, deps, positionOf);
  if (drawn === null || view === null || tutorial === undefined) {
    return null;
  }
  const ink = toneOf(tutorial, tutorial.quests.find(({ key }) => key === view.key)?.category).ink;
  const markers = drawn.pins.flatMap((pin, at): MapMarker[] => {
    const image = images[at];
    return image === undefined
      ? []
      : [
          {
            id: pin.id,
            name: pin.label ?? '튜토리얼 장소',
            position: pin.position,
            image,
            order: 3,
            ...(pin.label === undefined ? {} : { text: pin.label }),
          },
        ];
  });
  return {
    markers,
    lines: [...wayOf(drawn.guide, view, ink, me, positionOf), ...(deps.route === null ? [] : [deps.route])],
    onPress: (id) => {
      const pin = drawn.pins.find((one) => one.id === id);
      if (pin?.spot !== undefined) {
        flow.pickSpot(pin.spot);
      } else if (pin?.step !== undefined) {
        flow.goToStep(pin.step);
      }
    },
  };
}

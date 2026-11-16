/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useRef, useState } from 'react';
import { isRefusal } from '@/api/errors';
import { isTooSmall } from '@/api/private-zone-outline';
import type { LatLng } from '@/api/types';
import { useToast } from '@/design-system';
import { thinned } from '@/features/private-zones/thinning';
import { usePrivateZoneChanges } from '@/features/private-zones/use-private-zones';
import { atPoint, type MapCamera, type Point, type Size } from '@/map';

export const BIGGER = '조금 더 크게 둘러 주세요';
export const FIVE_AT_MOST = '5곳까지 그릴 수 있어요';
const SAVED = '저장했어요 · 이 안에서는 친구에게 시간표만 보여요';
const OUTLINE_MIN_POINTS = 3;

// The camera the map last settled at, and the size of its view, by which a point of the view is a position.
export interface ZoneView {
  camera: MapCamera;
  size: Size;
}

interface Stroke {
  // The finger's path while it is down.
  path: readonly Point[] | null;
  begin: (point: Point) => void;
  extend: (point: Point) => void;
  end: () => void;
}

// The same functions from render to render, so that the pan that calls them is made once.
function useStroke(onDrawn: (path: readonly Point[]) => void): Stroke {
  const [path, setPath] = useState<readonly Point[] | null>(null);
  const kept = useRef<Point[]>([]);
  const drawn = useRef(onDrawn);
  useEffect(() => {
    drawn.current = onDrawn;
  });
  const begin = useCallback((point: Point) => {
    kept.current = [point];
    setPath(kept.current);
  }, []);
  const extend = useCallback((point: Point) => {
    kept.current = [...kept.current, point];
    setPath(kept.current);
  }, []);
  const end = useCallback(() => {
    setPath(null);
    drawn.current(kept.current);
    kept.current = [];
  }, []);
  return { path, begin, extend, end };
}

export interface ZoneDrawing {
  pencil: boolean;
  togglePencil: () => void;
  stroke: Stroke;
  // The outline drawn and not yet saved, which the next one replaces.
  unsaved: readonly LatLng[] | null;
  // Why it cannot be saved as it is.
  problem: string | null;
  saving: boolean;
  save: () => void;
  cancel: () => void;
}

// The line for a refusal that drawing again may mend; null for any other.
function lineFor(error: unknown): string | null {
  if (isRefusal(error, 400, 'PRIVATE_ZONE_OFF_CAMPUS')) {
    return '캠퍼스 가까이에서만 그릴 수 있어요';
  }
  if (isRefusal(error, 400, 'PRIVATE_ZONE_TOO_SMALL')) {
    return BIGGER;
  }
  return isRefusal(error, 409, 'PRIVATE_ZONES_FULL') ? FIVE_AT_MOST : null;
}

// Sends the outline once, and says how it went: the toast once saved, a line for a refusal that drawing again may
// mend, and a toast for any other failure.
function useSave(
  onSaved: () => void,
  onLine: (line: string) => void,
): { saving: boolean; send: (outline: readonly LatLng[]) => void } {
  const [saving, setSaving] = useState(false);
  const changes = usePrivateZoneChanges();
  const showToast = useToast();
  const send = (outline: readonly LatLng[]): void => {
    setSaving(true);
    changes.add([...outline]).then(
      () => {
        setSaving(false);
        onSaved();
        showToast(SAVED);
      },
      (error: unknown) => {
        setSaving(false);
        const line = lineFor(error);
        if (line === null) {
          showToast('저장하지 못했어요');
        } else {
          onLine(line);
        }
      },
    );
  };
  return { saving, send };
}

// The pencil, the outline it draws, and its saving. A finger that barely moves draws nothing and leaves the unsaved
// outline as it was; an outline that fits in a 17 m square is shown with its line and is not sent.
export function useZoneDrawing(view: ZoneView | null): ZoneDrawing {
  const [pencil, setPencil] = useState(false);
  const [unsaved, setUnsaved] = useState<readonly LatLng[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const drop = (): void => {
    setUnsaved(null);
    setProblem(null);
    setPencil(false);
  };
  const { saving, send } = useSave(drop, setProblem);
  const stroke = useStroke((path) => {
    const points = thinned(path);
    if (view === null || points.length < OUTLINE_MIN_POINTS) {
      return;
    }
    const outline = points.map((point) => atPoint(point, view.camera, view.size));
    setUnsaved(outline);
    setProblem(isTooSmall(outline) ? BIGGER : null);
  });
  const save = (): void => {
    if (unsaved !== null && problem === null && !saving) {
      send(unsaved);
    }
  };
  const togglePencil = (): void => {
    setPencil((on) => !on);
  };
  return { pencil, togglePencil, stroke, unsaved, problem, saving, save, cancel: drop };
}

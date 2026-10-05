import { type RefObject, useCallback, useRef, useState } from 'react';
import type { LatLng } from '@/api/types';
import {
  CAMPUS_BOUNDS,
  centreOf,
  type FitPadding,
  type MapCamera,
  type MapHandle,
  ZOOM_OFFSET,
  type ZoomDetail,
  zoomDetail,
} from '@/map';
import { useCameraMoves } from './use-camera-moves';

export type ZoomLevel = 'pins' | 'names' | 'close';

// The main screen's map, as the screen's parts hold it: what the camera shows and the moves they ask of it.
export interface MainMap {
  // For `<Map>`.
  ref: RefObject<MapHandle | null>;
  onCameraIdle: (camera: MapCamera) => void;
  onFitZoom: (zoom: number) => void;
  // Where the camera rests. Null until the map is ready.
  camera: MapCamera | null;
  // The zoom at which the whole campus is in view. Null until the map is ready.
  fitZoom: number | null;
  // How much detail the zoom asks for: `overview` while the whole campus is in view.
  detail: ZoomDetail;
  // The moves. One asked before the map is ready is carried out when it is; of several, the last.
  // One press of the zoom in button for 1, of the zoom out button for -1: a factor 1.5 around the view's centre.
  zoomBy: (steps: number) => void;
  // To a position at a level of `ZOOM_OFFSET`. With `orCloser`, a camera that is closer already keeps its zoom.
  goTo: (position: LatLng, level: ZoomLevel, orCloser?: boolean) => void;
  showCampus: () => void;
  // To the closest view that shows all the points inside what the padding leaves of the view, and no closer than
  // the "pins" level, which is where the `Main` frame goes for a route.
  fitTo: (points: readonly LatLng[], padding: FitPadding) => void;
}

// Owns the map's handle and follows its camera. The zoom is counted from the fit zoom, which the map gives. A move
// asked before the map is ready is carried out when it is.
export function useMainMap(): MainMap {
  const ref = useRef<MapHandle>(null);
  const [camera, setCamera] = useState<MapCamera | null>(null);
  const [fitZoom, setFitZoom] = useState<number | null>(null);
  const { move, fit: fitInto, rested, fitted } = useCameraMoves(ref);
  const onCameraIdle = useCallback(
    (now: MapCamera) => {
      setCamera(now);
      rested(now.zoom);
    },
    [rested],
  );
  const onFitZoom = useCallback(
    (zoom: number) => {
      setFitZoom(zoom);
      fitted(zoom);
    },
    [fitted],
  );
  const zoomBy = useCallback(
    (steps: number) => {
      move((_fit, zoomNow) => ({ zoom: zoomNow + steps * ZOOM_OFFSET.step }));
    },
    [move],
  );
  const goTo = useCallback(
    (position: LatLng, level: ZoomLevel, orCloser = false) => {
      move((fit, zoomNow) => {
        const zoom = fit + ZOOM_OFFSET[level];
        return { centre: position, zoom: orCloser ? Math.max(zoom, zoomNow) : zoom };
      });
    },
    [move],
  );
  const showCampus = useCallback(() => {
    move((fit) => ({ centre: centreOf(CAMPUS_BOUNDS), zoom: fit }));
  }, [move]);
  const fitTo = useCallback(
    (points: readonly LatLng[], padding: FitPadding) => {
      fitInto(points, padding, ZOOM_OFFSET.pins);
    },
    [fitInto],
  );
  const detail = camera === null || fitZoom === null ? 'overview' : zoomDetail(camera.zoom, fitZoom);
  return { ref, onCameraIdle, onFitZoom, camera, fitZoom, detail, zoomBy, goTo, showCampus, fitTo };
}

import { type RefObject, useCallback, useRef, useState } from 'react';
import type { LatLng } from '@/api/types';
import {
  CAMPUS_BOUNDS,
  centreOf,
  type MapCamera,
  type MapHandle,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_OFFSET,
  type ZoomDetail,
  zoomDetail,
} from '@/map';

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
  // One press of the zoom in button for 1, of the zoom out button for -1: a factor 1.5 around the view's centre.
  zoomBy: (steps: number) => void;
  // To a position at a level of `ZOOM_OFFSET`. With `orCloser`, a camera that is closer already keeps its zoom.
  goTo: (position: LatLng, level: ZoomLevel, orCloser?: boolean) => void;
  showCampus: () => void;
}

// Owns the map's handle and follows its camera. The zoom is counted from the fit zoom, which the map gives.
export function useMainMap(): MainMap {
  const ref = useRef<MapHandle>(null);
  const [camera, setCamera] = useState<MapCamera | null>(null);
  const [fitZoom, setFitZoom] = useState<number | null>(null);
  // The zoom the camera rests at or is on its way to, so that a second press during a move counts from the first.
  const aim = useRef<number | null>(null);
  const onCameraIdle = useCallback((rested: MapCamera) => {
    aim.current = rested.zoom;
    setCamera(rested);
  }, []);
  const zoomTo = useCallback(
    (zoom: number, centre?: LatLng) => {
      const within = Math.min(Math.max(zoom, fitZoom ?? MIN_ZOOM), MAX_ZOOM);
      aim.current = within;
      ref.current?.moveCamera({ centre, zoom: within, animated: true });
    },
    [fitZoom],
  );
  const zoomBy = useCallback(
    (steps: number) => {
      if (aim.current !== null) {
        zoomTo(aim.current + steps * ZOOM_OFFSET.step);
      }
    },
    [zoomTo],
  );
  const goTo = useCallback(
    (position: LatLng, level: ZoomLevel, orCloser = false) => {
      const zoom = (fitZoom ?? MIN_ZOOM) + ZOOM_OFFSET[level];
      zoomTo(orCloser ? Math.max(zoom, aim.current ?? zoom) : zoom, position);
    },
    [fitZoom, zoomTo],
  );
  const showCampus = useCallback(() => {
    zoomTo(MIN_ZOOM, centreOf(CAMPUS_BOUNDS));
  }, [zoomTo]);
  const detail = camera === null || fitZoom === null ? 'overview' : zoomDetail(camera.zoom, fitZoom);
  return { ref, onCameraIdle, onFitZoom: setFitZoom, camera, fitZoom, detail, zoomBy, goTo, showCampus };
}

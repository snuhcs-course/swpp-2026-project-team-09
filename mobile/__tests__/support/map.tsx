import type { LatLng } from '@/api/types';
import {
  CAMPUS_BOUNDS,
  type MapAvatar,
  type MapMarker,
  type MapProps,
  type MarkerImage,
  MAX_ZOOM,
  MIN_ZOOM,
} from '@/map';

export const GATE: LatLng = { latitude: 37.4499, longitude: 126.9525 };
export const LIBRARY: LatLng = { latitude: 37.4598, longitude: 126.9521 };

// An image as a test has it: the look's name without a picture.
export function imageOf(look: string): MarkerImage {
  return { look, uri: null, width: 0, height: 0, anchor: { x: 0.5, y: 0.5 } };
}

export const EVENT: MapMarker = {
  id: 'event:e1',
  name: 'AI 커리어 채용설명회',
  position: GATE,
  image: imageOf('official:pin'),
  text: 'AI 커리어',
};

export const FRIEND: MapAvatar = {
  id: 'friend:f1',
  name: '김민준',
  position: LIBRARY,
  image: imageOf('friend:pin:free:김민준:'),
  glideMs: 5000,
};

// What a screen gives the map when it shows nothing yet.
export const EMPTY: MapProps = {
  bounds: CAMPUS_BOUNDS,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  markers: [],
  avatars: [],
  route: null,
};

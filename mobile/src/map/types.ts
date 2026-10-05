import type { Ref } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { LatLng } from '@/api/types';

// What a screen can ask of a map, whichever map draws it. Every position is a latitude and a longitude in degrees.
// The plain ground and the native modules implement this; what it cannot say, no screen can ask.

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

// A picture a native map can draw, made once for each look from the design system's marker views
// (`marker-images.tsx`).
export interface MarkerImage {
  // The look's name, such as "official:pin". It is the same for the same look, so a map may keep one picture per name.
  look: string;
  // Where the picture is: a file of this run of the app, or on the web a data address. It is null until the picture
  // is made, and stays null where none can be made, as in a test. A map draws the marker once it is there.
  uri: string | null;
  // The picture's size in points; the file holds the phone's pixels. Both are 0 until the picture is made.
  width: number;
  height: number;
  // The point of the picture that stands on the position, as a share of its width and height: the middle of a dot,
  // the tip of a pin.
  anchor: { x: number; y: number };
}

export interface MapMarker {
  // Given back by `onPress`. A marker that keeps its identifier is the same marker, changed; one that is no longer
  // listed is removed.
  id: string;
  // What a screen reader says for it. The map does not draw it.
  name: string;
  position: LatLng;
  image: MarkerImage;
  // Drawn under the image by the map, in the map's own text.
  text?: string;
}

// An Avatar is a marker that glides: when its position changes, it moves there over `glideMs` milliseconds. A move
// that starts during another starts from where the Avatar is shown.
export interface MapAvatar extends MapMarker {
  glideMs: number;
}

export interface MapCamera {
  centre: LatLng;
  zoom: number;
}

export interface CameraMove {
  // Left out, the camera keeps its centre or its zoom.
  centre?: LatLng;
  zoom?: number;
  // Left out, the camera jumps.
  animated?: boolean;
}

export interface MapHandle {
  // The map keeps the camera inside `bounds` and the zoom limits whatever is asked, and answers every move with
  // `onCameraIdle`.
  moveCamera: (move: CameraMove) => void;
}

export interface MapProps {
  // The rectangle the camera stays in. The map opens on its middle at `minZoom`.
  bounds: MapBounds;
  minZoom: number;
  maxZoom: number;
  markers: readonly MapMarker[];
  avatars: readonly MapAvatar[];
  // The one route line, drawn through these points in order. Null for none.
  route: readonly LatLng[] | null;
  // A press on a marker or an Avatar, with its identifier.
  onPress?: (id: string) => void;
  // The camera stopped: once when the map is ready, and after every move, the User's or `moveCamera`'s.
  onCameraIdle?: (camera: MapCamera) => void;
  ref?: Ref<MapHandle>;
  // The map fills its parent unless this says otherwise.
  style?: StyleProp<ViewStyle>;
}

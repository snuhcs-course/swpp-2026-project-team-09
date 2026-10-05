import type { Ref } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { LatLng } from '@/api/types';
import type { MarkerLook } from './marker-looks';

// What a screen can ask of a map, whichever map draws it. The plain ground and the native modules implement this,
// each to the letter of the rules written here; what it cannot say, no screen can ask.
//
// Every position is a latitude and a longitude in degrees. A zoom is the Web Mercator zoom level at the camera's
// centre: at zoom z the whole world is 256 × 2^z points wide. It may be a fraction. A native side converts it to
// its SDK's own scale and back.

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

// A picture a native map can draw, made once for each look from the design system's marker views
// (`marker-images.tsx`).
export interface MarkerImage {
  // The look's name, such as "official:pin". It is the same for the same look, so a map keeps one picture per name.
  look: string;
  // What the picture is of. The plain ground draws the design system's view from it; a native side does not read it.
  view: MarkerLook;
  // Where the picture is: a file of this run of the app. Null until the picture is made, and always null in a build
  // without a native map, where none is made. A native side draws the marker once it is there, and reads the
  // picture again whenever the `uri` under a look's name changes: a Friend's photo that arrives late replaces the
  // picture made without it.
  uri: string | null;
  // The picture's size in points; the file holds the phone's pixels. Both are 0 until the picture is made.
  width: number;
  height: number;
  // The point of the picture that stands on the position, as a share of its width and height: the middle of a dot,
  // the tip of a pin.
  anchor: { x: number; y: number };
}

export interface MapMarker {
  // Given back by `onPress`. In a new list, a marker with a new identifier is added, one whose identifier stays is
  // the same marker, changed, and one that is no longer listed is removed.
  id: string;
  // What a screen reader says for it. The map does not draw it.
  name: string;
  position: LatLng;
  image: MarkerImage;
  // Drawn under the image by the map, in the map's own text.
  text?: string;
  // What is drawn above what. Every Avatar is above every marker. Among markers, and among Avatars, the higher
  // `order` is on top; without one it is 0, and of two that are equal the later in the list is on top. Which one
  // matters most, such as the User's own Avatar or a selected marker, is the screen's to say.
  order?: number;
}

// An Avatar is a marker that glides. The rules, for every implementation:
// - The map keeps each Avatar's last target, by `id`, and starts a glide only when `position` differs from it. The
//   lists are new on every render; the same position in a new list is no move.
// - An Avatar that first appears is placed at its position without a glide.
// - A new position is reached over `glideMs` milliseconds, at an even speed. A new position during a glide starts
//   from where the Avatar is shown at that moment.
// - A change of `image`, `text`, `name` or `order` alone changes what is drawn and does not restart a glide.
// - With a `glideMs` of 0 the Avatar is placed at once.
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

export interface FitOptions {
  // Clear room between the points and the view's edges, in points. Left out, 0.
  padding?: number;
  // Left out, the camera jumps.
  animated?: boolean;
}

// The camera's rules, for every implementation:
// - The camera stays inside `bounds`: the visible area never leaves the rectangle. So the lowest zoom allowed is the
//   larger of `minZoom` and the zoom at which the view just fits inside `bounds`, which depends on the view's size,
//   and the centre is kept far enough from the rectangle's edges for the view's edges to stay inside. The highest
//   zoom is `maxZoom`. The rectangle wins where the two disagree.
// - The map opens on the middle of `bounds` at the lowest zoom allowed.
// - Whatever is asked is first brought inside these rules.
// - `onCameraIdle` is sent once when the map is ready, and each time the camera comes to rest somewhere else: after
//   a User's pan or zoom ends, and after `moveCamera` or `fitTo`, animated or not. A call that changes nothing
//   sends nothing.
export interface MapHandle {
  moveCamera: (move: CameraMove) => void;
  // Moves the camera to the middle of the points, at the closest zoom at which all of them are inside the view with
  // the padding. No points, no move.
  fitTo: (points: readonly LatLng[], options?: FitOptions) => void;
}

export interface MapProps {
  // The rectangle the camera stays in.
  bounds: MapBounds;
  minZoom: number;
  maxZoom: number;
  markers: readonly MapMarker[];
  avatars: readonly MapAvatar[];
  // The one route line, drawn through these points in order, under the markers. Null for none.
  route: readonly LatLng[] | null;
  // A press on a marker or an Avatar, with its identifier.
  onPress?: (id: string) => void;
  onCameraIdle?: (camera: MapCamera) => void;
  ref?: Ref<MapHandle>;
  // The map fills its parent unless this says otherwise.
  style?: StyleProp<ViewStyle>;
}

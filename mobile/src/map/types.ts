// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-05 to 2026-10-09, prompted by AhnJinYoung, fyoon46 and Jaehyun0320, reviewed by fyoon46 in #74
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
  // It takes no press: `onPress` is never sent for it, and a press on it goes to what is drawn under it, another
  // marker or the map. It is still drawn, and a screen reader still reads its `name`. Left out, it takes presses.
  passive?: boolean;
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

// Clear room at each edge of the view, in points: what a screen's controls cover there.
export interface FitPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// The part of the map's edges that a screen's controls cover, in points from each edge. A side left out is 0.
export interface MapInset {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface FitOptions {
  // Clear room between the points and the view's edges, in points: one number for all four edges, or one for each.
  // The points are fitted into what is left of the view, and its middle is where their middle comes. Left out, 0.
  padding?: number | FitPadding;
  // The closest the camera may come: points that are near each other are shown from here and no closer. Left out,
  // the map's `maxZoom`.
  maxZoom?: number;
  // Left out, the camera jumps.
  animated?: boolean;
}

// How a line is drawn.
export interface LineStyle {
  color: string;
  // In points on the screen, the same at every zoom.
  width: number;
  // A dashed line: the length of a dash and of the gap after it, in points on the screen, the same at every zoom,
  // measured as SVG's `stroke-dasharray` is. Left out, a solid line.
  dash?: readonly [length: number, gap: number];
}

// A line through points in order, such as a walking route or the shuttle's route. Its ends and its dashes are round.
// The rules, for every implementation:
// - every line is drawn under every marker and Avatar;
// - among lines, the later in the list is on top;
// - in a new list, a line with a new `id` is added, one whose `id` stays is the same line with its points or its
//   style changed, and one that is no longer listed is removed;
// - the same points and style in a new list draw nothing again. The lists are new on every render.
export interface MapLine {
  id: string;
  points: readonly LatLng[];
  style: LineStyle;
}

// The camera's rules, for every implementation:
// - The camera stays inside `bounds`: the visible area never leaves the rectangle. The lowest zoom allowed is the
//   larger of `minZoom` and the zoom at which the view just fits inside `fitBounds` (`bounds` when left out), which
//   depends on the view's size, and the centre is kept far enough from the edges of `bounds` for the view's edges to
//   stay inside. The highest zoom is `maxZoom`. The rectangle wins where the two disagree.
// - The map opens on the middle of `bounds` at the lowest zoom allowed.
// - Whatever is asked is first brought inside these rules.
// - `onCameraIdle` is sent once when the map is ready, and each time the camera comes to rest somewhere else: after
//   a User's pan or zoom ends, and after `moveCamera` or `fitTo`, animated or not. A call that changes nothing
//   sends nothing.
// - `onFitZoom` gives the fit zoom: the lowest zoom allowed, at which the map opens and the whole campus is in view.
//   It is sent once when the map is ready, before the first `onCameraIdle`, and again whenever it changes, which it
//   does with the view's size. A screen counts its zoom levels from it (`ZOOM_OFFSET` in `campus.ts`).
export interface MapHandle {
  moveCamera: (move: CameraMove) => void;
  // Moves the camera so that the middle of the points is in the middle of what the padding leaves of the view, at
  // the closest zoom at which all of them are inside it, and no closer than the options' `maxZoom`. No points, no
  // move.
  fitTo: (points: readonly LatLng[], options?: FitOptions) => void;
}

export interface MapProps {
  // The rectangle the camera stays in.
  bounds: MapBounds;
  // The rectangle the lowest zoom fits the view inside, by the camera's rules above. Left out, `bounds`.
  fitBounds?: MapBounds;
  minZoom: number;
  // The lowest level of a native map's SDK, which takes whole levels only: pinching out stops there. The plain map
  // has no levels and keeps to the camera's rules alone. Left out, the SDK's own.
  nativeMinLevel?: number;
  maxZoom: number;
  markers: readonly MapMarker[];
  avatars: readonly MapAvatar[];
  // The lines, by the rules of `MapLine`.
  lines: readonly MapLine[];
  // A press on a marker or an Avatar, with its identifier.
  onPress?: (id: string) => void;
  onCameraIdle?: (camera: MapCamera) => void;
  // The lowest zoom allowed, in the map's own measure: see the camera's rules above.
  onFitZoom?: (zoom: number) => void;
  // What the screen's controls cover of the map's edges. The rule, for every implementation: the credit for the map
  // data and a provider's logo are drawn inside what is left, the credit at its bottom left and the logo at its
  // bottom right, each with the map's own margin. Nothing else follows it: the map is drawn under the controls as
  // before, and the cameras may ignore it, so `moveCamera` and `fitTo` centre on the whole view (a fit takes its own
  // `padding`). It may change while the map is shown, and the credit and the logo move with it. Left out, 0 at
  // every edge.
  inset?: MapInset;
  // A press on the credit, which the app draws over every map. Without it the credit takes no press.
  onCreditPress?: () => void;
  ref?: Ref<MapHandle>;
  // The map fills its parent unless this says otherwise.
  style?: StyleProp<ViewStyle>;
}

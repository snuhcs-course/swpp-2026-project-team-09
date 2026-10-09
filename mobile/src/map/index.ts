/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// The app's one map. A screen shows a map with `Map` and nothing else: no screen calls a map SDK or the native
// module.
export {
  CAMERA_BOUNDS,
  CAMPUS_BOUNDS,
  CAMPUS_CAMERA,
  centreOf,
  isInside,
  MAX_ZOOM,
  MIN_ZOOM,
  NATIVE_MIN_LEVEL,
  ZOOM_OFFSET,
  type ZoomDetail,
  zoomDetail,
} from './campus';
export { CREDIT_ROOM, Map } from './map';
export { MarkerImageStage, unmadeImage, useMarkerImages } from './marker-images';
export type { MarkerForm, MarkerLook } from './marker-looks';
export type {
  CameraMove,
  FitOptions,
  FitPadding,
  MapAvatar,
  MapBounds,
  MapCamera,
  MapHandle,
  MapInset,
  MapLine,
  MapMarker,
  MapProps,
  MarkerImage,
  LineStyle,
} from './types';

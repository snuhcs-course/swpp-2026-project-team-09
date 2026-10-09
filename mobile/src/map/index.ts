// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-05 to 2026-10-09, prompted by AhnJinYoung, fyoon46 and Jaehyun0320, reviewed by fyoon46 in #74
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

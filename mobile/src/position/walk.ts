// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by AhnJinYoung
import type { LatLng } from '@/api/types';

// The walk on campus for development: a fixed round from where the `Main` frame draws the User, past the central
// library and back. Each step is one stretch of it, so that the Avatar's gliding is seen from the whole campus too.
export const WALK: readonly LatLng[] = [
  { latitude: 37.45905, longitude: 126.9512 },
  { latitude: 37.45948, longitude: 126.95158 },
  { latitude: 37.45992, longitude: 126.95196 },
  { latitude: 37.46031, longitude: 126.95241 },
  { latitude: 37.46018, longitude: 126.95302 },
  { latitude: 37.45971, longitude: 126.95334 },
  { latitude: 37.45921, longitude: 126.95318 },
  { latitude: 37.45876, longitude: 126.95281 },
  { latitude: 37.45842, longitude: 126.95229 },
  { latitude: 37.45851, longitude: 126.95168 },
];

const START: LatLng = { latitude: 37.45905, longitude: 126.9512 };

// Where the walk is after a number of steps. The round starts again when it ends.
export function walkAt(step: number): LatLng {
  return WALK[step % WALK.length] ?? START;
}

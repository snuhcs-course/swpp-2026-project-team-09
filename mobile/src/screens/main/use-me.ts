/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LocationMissing } from '@/api/refusal-types';
import type { LatLng } from '@/api/types';
import { useToast } from '@/design-system';
import {
  CAMPUS_BOUNDS,
  inView,
  isInside,
  type MapAvatar,
  type MapCamera,
  type MapMarker,
  type MarkerLook,
  type Size,
  useMarkerImages,
} from '@/map';
import { openLocationSettings, type PositionPermission, usePosition } from '@/position';
import { useLocationExplanation } from './use-location-explanation';
import type { MainMap } from './use-main-map';
import { FLAG_ORDER } from './use-things';

// The identifier of the User's own Avatar on the map. On the everyday map it takes a press (`pressableMe`); elsewhere
// it takes none, as in the frame: a press on it reaches a Friend's marker that it stands over.
export const ME_AVATAR_ID = 'me';

// Under every other Avatar, whose order is 0 or more.
const UNDER_FACES = -1;
const OVER_FLAGS = FLAG_ORDER + 1;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function boxOf({ position, image }: MapMarker, camera: MapCamera, size: Size): Box {
  const { x, y } = inView(position, camera, size);
  const left = x - image.anchor.x * image.width;
  const top = y - image.anchor.y * image.height;
  return { left, top, right: left + image.width, bottom: top + image.height };
}

function overlap(one: Box, other: Box): boolean {
  return one.left < other.right && other.left < one.right && one.top < other.bottom && other.top < one.bottom;
}

// The User's own Avatar as the everyday map draws it, as row 6's boards draw it: it takes a press, which opens the
// User's own card, and lies under the faces, so that a face over it keeps its press. A flag among `others` is above
// every face (P10 ticket 13), so where a flag's picture covers the User's own, the User's own is raised above it, and
// a press there opens the User's own card. Until the map is laid out and its camera known, no flag is known to cover
// it.
export function pressableMe(
  avatars: readonly MapAvatar[],
  others: readonly MapAvatar[],
  camera: MapCamera | null,
  size: Size | null,
): MapAvatar[] {
  const flags = others.filter(({ order }) => order === FLAG_ORDER);
  const covers = (one: MapMarker, other: MapMarker): boolean =>
    camera !== null && size !== null && overlap(boxOf(one, camera, size), boxOf(other, camera, size));
  return avatars.map((avatar) => {
    const covered = flags.some((flag) => covers(avatar, flag));
    return { ...avatar, passive: false, order: covered ? OVER_FLAGS : UNDER_FACES };
  });
}

export const OFF_CAMPUS = '캠퍼스 밖에 있어요';
export const FINDING_POSITION = '위치를 찾는 중이에요';

// Both of the User's own looks are asked for when the screen opens, so that the change between them at the "pins"
// level never hands a native map an image whose picture is still to be made.
const MY_LOOKS: readonly MarkerLook[] = [{ kind: 'me' }, { kind: 'me', small: true }];

export interface Me {
  permission: PositionPermission;
  // The User's position while it is inside the campus rectangle. Null off campus, without the permission and until
  // the first position comes. A route starts from here.
  position: LatLng | null;
  // For `<Map>`: the User's own Avatar, or nothing.
  avatars: readonly MapAvatar[];
  // The phone told a position and it is outside the campus rectangle.
  offCampus: boolean;
  // Why the Assistant is sent no position: the permission refused or never asked, or off campus. Null otherwise, while
  // the permission is being read included.
  locationMissing: LocationMissing;
  // "내 위치로 이동".
  goToMe: () => void;
  // Says why the map has no position to start from, for a part that needs one: the explanation before the location
  // prompt without the permission, "캠퍼스 밖에 있어요" off campus, or "위치를 찾는 중이에요", with the phone's watch
  // started again. True when it showed the explanation.
  sayWhyNotHere: () => boolean;
  // The explanation before the system's location prompt, and its two answers. `blocked`: the system no longer
  // prompts, so the explanation leads to the phone's settings instead.
  explaining: boolean;
  blocked: boolean;
  allow: () => void;
  later: () => void;
}

function missingOf(permission: PositionPermission, offCampus: boolean): LocationMissing {
  if (permission !== 'granted' && permission !== 'checking') {
    return 'permission';
  }
  return offCampus ? 'off-campus' : null;
}

// The User on the main screen's map: their Avatar while they are on campus, and the button that brings the map to
// them. The Avatar is at three quarters of its size while the whole campus is in view, and glides to each new
// position over the time that position took to come.
export function useMe(map: MainMap): Me {
  const { permission, position: phone, stepMs, ask, retry } = usePosition();
  const { explaining, explain, close } = useLocationExplanation(permission);
  const showToast = useToast();
  const [full, small] = useMarkerImages(MY_LOOKS);
  const image = map.detail === 'overview' ? small : full;
  const position = phone !== null && isInside(phone, CAMPUS_BOUNDS) ? phone : null;
  const offCampus = phone !== null && position === null;
  const sayWhyNotHere = (): boolean => {
    if (permission !== 'granted') {
      explain();
      return true;
    }
    if (phone === null) {
      // No position yet, or a watch that could not start: it is started again.
      retry();
    }
    showToast(offCampus ? OFF_CAMPUS : FINDING_POSITION);
    return false;
  };
  const goToMe = (): void => {
    if (permission === 'checking') {
      return;
    }
    if (position !== null) {
      map.goTo(position, 'close', true);
    } else if (!sayWhyNotHere() && offCampus) {
      map.showCampus();
    }
  };
  return {
    permission,
    position,
    avatars:
      position === null || image === undefined
        ? []
        : [{ id: ME_AVATAR_ID, name: '내 위치', position, image, glideMs: stepMs, order: 1, passive: true }],
    offCampus,
    locationMissing: missingOf(permission, offCampus),
    goToMe,
    sayWhyNotHere,
    explaining,
    blocked: permission === 'blocked',
    allow: (): void => {
      close();
      void (permission === 'blocked' ? openLocationSettings() : ask());
    },
    later: close,
  };
}

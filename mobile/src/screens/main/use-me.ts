import type { LatLng } from '@/api/types';
import { useToast } from '@/design-system';
import { CAMPUS_BOUNDS, isInside, type MapAvatar, type MarkerLook, useMarkerImages } from '@/map';
import { openLocationSettings, type PositionPermission, usePosition } from '@/position';
import { useLocationExplanation } from './use-location-explanation';
import type { MainMap } from './use-main-map';

// The identifier of the User's own Avatar on the map. It takes no press, as in the frame: a press on it reaches a
// Friend's marker that it stands over.
export const ME_AVATAR_ID = 'me';

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
  const blocked = permission === 'blocked';
  return {
    permission,
    position,
    avatars:
      position === null || image === undefined
        ? []
        : [{ id: ME_AVATAR_ID, name: '내 위치', position, image, glideMs: stepMs, order: 1, passive: true }],
    offCampus,
    goToMe,
    sayWhyNotHere,
    explaining,
    blocked,
    allow: (): void => {
      close();
      void (blocked ? openLocationSettings() : ask());
    },
    later: close,
  };
}
